import { expect, it } from "vitest";
import { studyModules, findStudyModule } from "../src/studio/moduleCatalog";
import { emptyWorkspace, validateWorkspace } from "../src/persistence/schema";
import { customModuleSchema } from "../src/studio/schema";
import { customScore } from "../src/studio/modules";

it("модули подготовки доступны без импорта и принимаются общим учебным движком", () => {
  const data = emptyWorkspace();
  const modules = studyModules(data).filter((m) =>
    m.id.startsWith("custom-day-"),
  );
  expect(modules).toHaveLength(10);
  expect(data.customModules).toHaveLength(0);
  for (const m of modules) {
    expect(() => customModuleSchema.parse(m), m.title).not.toThrow();
    expect(findStudyModule(data, m.id)?.title).toBe(m.title);
    expect(customScore(m, [], []).completion).toBe(0);
    expect(m.sections.length).toBeGreaterThanOrEqual(3);
    expect(m.questions.length).toBeGreaterThanOrEqual(5);
  }
});
it("ответы итоговых задач соответствуют числам из плана, а баллы сохраняются после восстановления", () => {
  const data = emptyWorkspace();
  const m = findStudyModule(data, "custom-day-exam-problems");
  expect(m).toBeDefined();
  const module = m!;
  expect(module.questions.map((q) => q.options[q.correctIndex])).toEqual([
    "2 м/с² вправо; 4 м",
    "1 м/с; уменьшение на 6 Дж",
    "0,5 кг·м²; 4 рад/с²",
    "150 кПа; 0 Дж",
    "500 Дж; 40%",
    "200 Н/Кл; 60 В; 2·10⁻⁷ Н к источнику",
  ]);
  data.customRead[module.id] = module.sections.map((s) => s.id);
  data.customRuns.push({
    id: "day-run",
    moduleId: module.id,
    answers: module.questions.map((q) => q.correctIndex),
    createdAt: "2026-10-16T10:00:00.000Z",
  });
  data.studyChats.push({
    id: "day-chat",
    topicId: module.id,
    messages: [
      { role: "user", content: "Почему сила направлена к источнику?" },
    ],
    updatedAt: "2026-10-16T10:00:00.000Z",
  });
  const restored = validateWorkspace(JSON.parse(JSON.stringify(data)));
  expect(
    customScore(module, restored.customRuns, restored.customRead[module.id]),
  ).toMatchObject({ points: 100, completion: 100 });
  expect(restored.studyChats[0].topicId).toBe(module.id);
  expect(restored.customModules).toHaveLength(0);
});
it("старая копия получает версии подготовки, а подмена и неверные ссылки отклоняются", () => {
  const old = emptyWorkspace();
  delete old.contentVersions["custom-day-foundation"];
  expect(validateWorkspace(old).contentVersions["custom-day-foundation"]).toBe(
    1,
  );
  const m = findStudyModule(old, "custom-day-foundation")!;
  expect(() => validateWorkspace({ ...old, customModules: [m] })).toThrow();
  expect(() =>
    validateWorkspace({
      ...old,
      contentVersions: { ...old.contentVersions, [m.id]: 2 },
    }),
  ).toThrow();
  expect(() =>
    validateWorkspace({ ...old, customRead: { [m.id]: ["wrong-section"] } }),
  ).toThrow();
});

it("каждая тема полного курса доступна из блоков плана, и порядок имеет длительность из PDF", async () => {
  const { dayEntries } = await import("../src/content/day-plan/catalog");
  const linked = [...new Set(dayEntries.flatMap((e) => e.relatedTopics))];
  const data = emptyWorkspace();
  expect(linked).toHaveLength(27);
  for (const topic of linked)
    expect(findStudyModule(data, topic), topic).toBeDefined();
  expect(dayEntries.map((e) => e.minutes)).toEqual([
    20, 50, 50, 45, 45, 60, 70, 45, 12, 33,
  ]);
  expect(dayEntries.every((e) => e.pages.every((p) => p >= 3 && p <= 14))).toBe(
    true,
  );
});

it("формулы новых модулей разбираются без ошибок и предупреждений KaTeX", async () => {
  const { renderToString } = await import("katex");
  for (const m of studyModules(emptyWorkspace()).filter((m) =>
    m.id.startsWith("custom-day-"),
  )) {
    for (const s of m.sections)
      for (const formula of s.body.match(/\$[^$\n]+\$/g) ?? []) {
        expect(
          () =>
            renderToString(formula.slice(1, -1), {
              throwOnError: true,
              strict: "error",
            }),
          `${m.id}: ${formula}`,
        ).not.toThrow();
      }
  }
});
