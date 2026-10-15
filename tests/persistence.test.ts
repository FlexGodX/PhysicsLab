import "fake-indexeddb/auto";
import { it, expect } from "vitest";
import { emptyWorkspace, validateImport } from "../src/persistence/schema";
import { saveWorkspace, loadWorkspace } from "../src/persistence/store";
import { makeAttempt } from "../src/learning/assessment";
import { k1Tasks } from "../src/content/k1";
it("восстанавливает точные ответы из IndexedDB", async () => {
  const data = emptyWorkspace();
  data.attempts.push(
    makeAttempt(
      k1Tasks.find((t) => t.id === "speed-a")!,
      "4",
      "м/с",
      0,
      null,
    ),
  );
  await saveWorkspace(data);
  expect(await loadWorkspace()).toEqual(data);
});
it("отклоняет повреждённый импорт, неизвестную версию, дубли и неверные ссылки", () => {
  const data = emptyWorkspace();
  const a = makeAttempt(k1Tasks[0], String(k1Tasks[0].answer), "", 0, null);
  for (const raw of [
    "{broken",
    JSON.stringify({ ...data, schemaVersion: 999 }),
    JSON.stringify({ ...data, attempts: [a, a] }),
    JSON.stringify({ ...data, attempts: [{ ...a, taskId: "missing" }] }),
  ])
    expect(() => validateImport(raw)).toThrow();
});
it("не доверяет принесённой оценке ответа", () => {
  const data = emptyWorkspace();
  const a = makeAttempt(k1Tasks[0], "неправильный ответ", "", 0, null);
  a.result.correct = true;
  data.attempts = [a];
  expect(validateImport(JSON.stringify(data)).attempts[0].result.correct).toBe(
    false,
  );
});
it("отказ валидации сохраняет прежние данные", async () => {
  const data = emptyWorkspace();
  await saveWorkspace(data);
  await expect(
    saveWorkspace({ ...data, schemaVersion: 99 } as never),
  ).rejects.toThrow();
  expect(await loadWorkspace()).toEqual(data);
});
it("не принимает усечённый опыт без конечного состояния", () => {
  const data = emptyWorkspace();
  data.experiments = [
    {
      id: "e1",
      simulationId: "L1",
      modelVersion: 1,
      parameterSnapshot: { x0: 0, v0: 0, a: 2, duration: 4 },
      samples: [{ t: 0, x: 0, v: 0, a: 2, displacement: 0, distance: 0 }],
      prediction: "16 м",
      observations: "16 м",
      conclusion: "Гипотеза совпала",
      selfReview: false,
      createdAt: new Date().toISOString(),
      sourceKind: "manual",
    },
  ];
  expect(() => validateImport(JSON.stringify(data))).toThrow();
});
it("переносит раннюю копию K1 без новых полей, сохраняя идентификаторы и ответы", () => {
  const current = emptyWorkspace();
  current.attempts = [
    makeAttempt(k1Tasks[0], String(k1Tasks[0].answer), "", 0, null),
  ];
  const legacy = JSON.parse(JSON.stringify(current));
  for (const field of [
    "hintHistory",
    "modelExperiments",
    "moduleMarks",
    "preferences",
    "diagnostics",
  ])
    delete legacy[field];
  const migrated = validateImport(JSON.stringify(legacy));
  expect(migrated.attempts).toEqual(current.attempts);
  expect(migrated.profileId).toBe(current.profileId);
  expect(migrated.diagnostics).toEqual([]);
  expect(migrated.modelExperiments).toEqual([]);
});
it("не принимает неизвестную версию содержания и подмену диагностического вопроса", () => {
  const d = emptyWorkspace();
  expect(() =>
    validateImport(JSON.stringify({ ...d, contentVersions: { K1: 999 } })),
  ).toThrow();
  expect(() =>
    validateImport(
      JSON.stringify({
        ...d,
        diagnostics: [
          {
            id: "d",
            version: 1,
            phase: "before",
            createdAt: new Date().toISOString(),
            responses: [
              {
                questionId: "unknown",
                kind: "skip",
                answer: null,
                at: new Date().toISOString(),
              },
            ],
          },
        ],
      }),
    ),
  ).toThrow();
});
it("архивная постановка остаётся точной после уточнения задания", async () => {
  const { archivedTasks } = await import("../src/content/archive");
  const d = emptyWorkspace();
  const old = archivedTasks.find((t) => t.id === "K2-acceleration-a")!;
  d.attempts = [makeAttempt(old, "12", "м/с²", 0, null)];
  const copy = validateImport(JSON.stringify(d));
  expect(copy.attempts[0].taskVersion).toBe(1);
  expect(copy.attempts[0].taskSnapshot.prompt).toBe(old.prompt);
  expect(copy.attempts[0].result.correct).toBe(true);
});
it("переносит все модели, ручную серию и известную архивную окружность", async () => {
  const { modelCatalog, modelSamples } = await import("../src/physics/catalog");
  const d = emptyWorkspace();
  d.modelExperiments = Object.values(modelCatalog).map((m) => ({
    id: m.id,
    modelId: m.id,
    modelVersion: m.id === "circular" ? 2 : 1,
    parameters: {
      ...m.defaults,
      ...(m.id === "circular" ? { releaseAt: 2 } : {}),
    },
    manualValues: m.id === "measurements" ? [0.99, 1, 1.01] : null,
    samples: modelSamples(
      m.id,
      { ...m.defaults, ...(m.id === "circular" ? { releaseAt: 2 } : {}) },
      m.id === "measurements" ? [0.99, 1, 1.01] : null,
    ),
    prediction: "Мой прогноз",
    observations: "Мои наблюдения",
    conclusion: "Мой вывод",
    selfReview: false,
    createdAt: new Date().toISOString(),
    context: "lesson",
  }));
  expect(validateImport(JSON.stringify(d)).modelExperiments).toEqual(
    JSON.parse(JSON.stringify(d.modelExperiments)),
  );
  const old = structuredClone(d.modelExperiments[0]);
  old.id = "old-circle";
  old.modelVersion = 1;
  for (const s of old.samples)
    if (s.phase * Number(old.parameters.duration) >= 2) {
      s.values.omega = 0;
      s.values.period =
        (2 * Math.PI * Number(old.parameters.radius)) /
        Number(old.parameters.speed);
    }
  d.modelExperiments.push(old);
  expect(validateImport(JSON.stringify(d)).modelExperiments.at(-1)).toEqual(
    JSON.parse(JSON.stringify(old)),
  );
});
it("откат транзакции после успешного put не теряет предыдущую базу", async () => {
  const data = emptyWorkspace();
  await saveWorkspace(data);
  const original = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function (
    ...args: Parameters<typeof original>
  ) {
    const request = original.apply(this, args);
    request.addEventListener("success", () => this.transaction.abort());
    return request;
  };
  try {
    await expect(
      saveWorkspace({ ...data, materialOpenedAt: new Date().toISOString() }),
    ).rejects.toThrow();
  } finally {
    IDBObjectStore.prototype.put = original;
  }
  expect(await loadWorkspace()).toEqual(data);
});
