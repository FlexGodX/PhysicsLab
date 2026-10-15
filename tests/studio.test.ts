import { it, expect } from "vitest";
import { moduleDraftSchema, customModuleSchema } from "../src/studio/schema";
import { createReadingModule, customScore } from "../src/studio/modules";
import { emptyWorkspace, validateWorkspace } from "../src/persistence/schema";
it("создаёт модуль чтения без выдуманных вопросов и баллов", () => {
  const m = createReadingModule(
    "Закон Гука",
    "Сила упругости пропорциональна удлинению.\n\nКоэффициент жёсткости измеряется в Н/м.",
    "lecture.docx",
  );
  expect(m.questions).toEqual([]);
  expect(m.sections.length).toBeGreaterThan(0);
  expect(customScore(m, [], [])).toMatchObject({ points: null, completion: 0 });
  expect(
    customScore(
      m,
      [],
      m.sections.map((s) => s.id),
    ),
  ).toMatchObject({ points: null, completion: 100 });
});
it("отклоняет вопрос без правильного варианта и исполняемые поля", () => {
  const base = {
    title: "Сила",
    objective: "Понять силу",
    sections: [{ title: "Закон", body: "Описание" }],
    example: "Пример",
    questions: [
      {
        prompt: "Вопрос",
        options: ["Один", "Два"],
        correctIndex: 4,
        explanation: "Ответ",
      },
    ],
    visualizations: [],
  };
  expect(() => moduleDraftSchema.parse(base)).toThrow();
  expect(() =>
    moduleDraftSchema.parse({ ...base, questions: [], script: "alert(1)" }),
  ).toThrow();
});
it("переносит новый модуль и отклоняет чужие результаты, мигрирует старую копию", () => {
  const d = emptyWorkspace();
  const m = createReadingModule(
    "Движение",
    "Путь измеряется в метрах.",
    "physics.pdf",
  );
  d.customModules = [m];
  expect(validateWorkspace(d).customModules[0].title).toBe("Движение");
  expect(() =>
    validateWorkspace({
      ...d,
      customRuns: [
        {
          id: "run",
          moduleId: "missing",
          answers: [],
          createdAt: new Date().toISOString(),
        },
      ],
    }),
  ).toThrow();
  const old = { ...d } as Record<string, unknown>;
  delete old.customModules;
  delete old.customRuns;
  delete old.customRead;
  delete old.studyChats;
  expect(validateWorkspace(old).customModules).toEqual([]);
  expect(() =>
    customModuleSchema.parse({
      ...m,
      sections: [m.sections[0], m.sections[0]],
    }),
  ).toThrow();
});
it("проверяет перенос вопросов и пересчитывает баллы без доверия готовому проценту", async () => {
  const { materializeModule } = await import("../src/studio/modules");
  const m = materializeModule(
    {
      title: "Силы",
      objective: "Понять",
      sections: [{ title: "Определение", body: "Сила измеряется в ньютонах" }],
      example: "",
      questions: [
        {
          prompt: "Единица силы?",
          options: ["Н", "м"],
          correctIndex: 0,
          explanation: "Ньютон.",
        },
      ],
      visualizations: [],
    },
    {
      kind: "prompt",
      name: "Описание темы",
      text: "Силы",
      provider: "lmstudio",
    },
  );
  const d = emptyWorkspace();
  d.customModules = [m];
  d.customRuns = [
    {
      id: "run",
      moduleId: m.id,
      answers: [1],
      createdAt: new Date().toISOString(),
    },
  ];
  const loaded = validateWorkspace(JSON.parse(JSON.stringify(d)));
  expect(
    customScore(loaded.customModules[0], loaded.customRuns, []).points,
  ).toBe(0);
  expect(() =>
    validateWorkspace({
      ...d,
      customRuns: [{ ...d.customRuns[0], answers: [5] }],
    }),
  ).toThrow();
});
it("не импортирует беседу с отсутствующей или повторной темой", () => {
  const d = emptyWorkspace();
  const chat = {
    id: "chat1",
    topicId: "missing",
    messages: [],
    updatedAt: new Date().toISOString(),
  };
  expect(() => validateWorkspace({ ...d, studyChats: [chat] })).toThrow();
  expect(() =>
    validateWorkspace({
      ...d,
      studyChats: [
        { ...chat, topicId: "K1" },
        { ...chat, id: "chat2", topicId: "K1" },
      ],
    }),
  ).toThrow();
});
