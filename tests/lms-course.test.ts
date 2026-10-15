import { expect, it } from "vitest";
import {
  lmsEntries,
  lmsGroups,
  lmsModules,
  lmsSources,
} from "../src/content/lms/catalog";
import { customModuleSchema } from "../src/studio/schema";
import { emptyWorkspace, validateWorkspace } from "../src/persistence/schema";
import { customScore } from "../src/studio/modules";

it("каталог содержит три раздела и 27 содержательных модулей, покрывая все 46 источников", () => {
  expect(lmsGroups).toHaveLength(3);
  expect(lmsModules).toHaveLength(27);
  expect(lmsSources.filter((s) => s.kind === "resource")).toHaveLength(24);
  expect(lmsSources.filter((s) => s.kind === "lesson")).toHaveLength(22);
  const referenced = new Set(lmsEntries.flatMap((e) => e.sourceIds));
  expect([...referenced].sort()).toEqual(lmsSources.map((s) => s.id).sort());
  expect(new Set(lmsModules.map((m) => m.id)).size).toBe(27);
  for (const entry of lmsEntries) {
    const m = entry.module;
    expect(() => customModuleSchema.parse(m), m.title).not.toThrow();
    expect(m.sections.length).toBeGreaterThanOrEqual(3);
    expect(
      m.sections.every((s) => s.body.length >= 100),
      m.title,
    ).toBe(true);
    expect(m.example.length, m.title).toBeGreaterThan(80);
    expect(m.questions).toHaveLength(5);
    expect(
      new Set(m.questions.map((q) => q.correctIndex)).size,
    ).toBeGreaterThan(1);
    expect(lmsGroups.some((g) => g.id === entry.groupId)).toBe(true);
    expect(customScore(m, [], [])).toMatchObject({
      points: null,
      completion: 0,
    });
  }
});
it("история поставляемого модуля, обсуждение и ссылки переносятся без копии содержания", () => {
  const data = emptyWorkspace(),
    m = lmsModules[0];
  data.customRead[m.id] = [m.sections[0].id];
  data.customRuns = [
    {
      id: "lms-run",
      moduleId: m.id,
      answers: m.questions.map((q) => q.correctIndex),
      createdAt: new Date().toISOString(),
    },
  ];
  data.studyChats = [
    {
      id: "lms-chat",
      topicId: m.id,
      messages: [{ role: "user", content: "Объясни тему" }],
      updatedAt: new Date().toISOString(),
    },
  ];
  data.visualizationExperiments = [
    {
      id: "lms-research",
      modelVersion: 1,
      figureSnapshot: {
        id: "lms-spring",
        title: "Пружина",
        mechanism: "spring",
        caption: "Идеальная модель",
      },
      topicId: m.id,
      question: "Как меняется сила?",
      prediction: "При удвоении удлинения сила удвоится",
      samples: [
        {
          parameters: { x: 20, k: 100 },
          readings: [2, 0.02],
          capturedAt: "2026-10-15T21:00:00.000Z",
        },
        {
          parameters: { x: 40, k: 100 },
          readings: [4, 0.08],
          capturedAt: "2026-10-15T21:00:00.000Z",
        },
      ],
      observations: "Сила изменилась от 2 до 4 Н",
      conclusion: "Сила пропорциональна удлинению",
      selfReview: true,
      createdAt: "2026-10-15T21:00:00.000Z",
      context: "playground",
    },
  ];
  const copy = validateWorkspace(JSON.parse(JSON.stringify(data)));
  expect(copy.customModules).toEqual([]);
  expect(copy.customRuns).toEqual(data.customRuns);
  expect(copy.customRead).toEqual(data.customRead);
  expect(copy.studyChats).toEqual(data.studyChats);
  expect(copy.visualizationExperiments).toEqual(data.visualizationExperiments);
  expect(customScore(m, copy.customRuns, copy.customRead[m.id]).points).toBe(
    100,
  );
});
it("старый профиль мигрирует, неизвестная версия и подмена каталога отклоняются", () => {
  const data = emptyWorkspace(),
    m = lmsModules[0];
  const old = {
    ...data,
    contentVersions: { K1: 1, K2: 1, M1: 1, T1: 1, R1: 1, E1: 1 },
  };
  expect(validateWorkspace(old).contentVersions[m.id]).toBe(1);
  expect(() =>
    validateWorkspace({
      ...data,
      contentVersions: { ...data.contentVersions, [m.id]: 999 },
    }),
  ).toThrow();
  expect(() => validateWorkspace({ ...data, customModules: [m] })).toThrow();
  expect(() =>
    validateWorkspace({ ...data, customRead: { [m.id]: ["missing-section"] } }),
  ).toThrow();
});
