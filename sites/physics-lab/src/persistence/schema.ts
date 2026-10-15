import {
  customModuleSchema,
  customRunSchema,
  chatSchema,
  visualizationSchema,
} from "../studio/schema";
import {
  diagnosticQuestions,
  diagnosticFollowup,
} from "../content/diagnostics";
import { z } from "zod";
import { visualizationExperimentSchema } from "../figures/experiment";
import { lmsVersions } from "../content/lms/catalog";
import { dayVersions } from "../content/day-plan/catalog";
import { bundledModules, findStudyModule } from "../studio/moduleCatalog";
import { evaluateModel, modelCatalog } from "../physics/catalog";
import type { Workspace } from "../content/types";
import { findTask } from "../content/registry";
import { gradeAnswer } from "../learning/assessment";
import { parseNumber } from "../physics/units";
import { linearState, validateLinear } from "../physics/linear";
const text = z.string().max(4000);
const id = z.string().min(1).max(100);
const date = z.iso.datetime();
const finite = z.number().finite();
const task = z
  .object({
    id,
    version: z.number().int().positive(),
    templateId: id,
    kind: z.enum(["concept", "units", "calculation", "prediction"]),
    prompt: text,
    options: z.array(text).max(10).optional(),
    answer: z.union([text, finite]),
    unit: z.string().max(20).optional(),
    critical: z.boolean(),
    outcomeIds: z.array(id).max(10),
    explanation: text,
    hints: z.tuple([text, text, text]),
    errorTag: id,
  })
  .strict();
const params = z
  .object({ x0: finite, v0: finite, a: finite, duration: finite })
  .strict();
const state = z
  .object({
    t: finite,
    x: finite,
    v: finite,
    a: finite,
    displacement: finite,
    distance: finite,
  })
  .strict();
const schema = z
  .object({
    visualizationExperiments: z
      .array(visualizationExperimentSchema)
      .max(2000)
      .default([]),
    visualizations: z
      .array(visualizationSchema.safeExtend({ id }))
      .max(100)
      .default([]),
    customModules: z.array(customModuleSchema).max(100).default([]),
    customRuns: z.array(customRunSchema).max(10000).default([]),
    customRead: z.record(id, z.array(id).max(20)).default({}),
    studyChats: z.array(chatSchema).max(100).default([]),
    modelExperiments: z
      .array(
        z
          .object({
            id,
            modelId: z.enum([
              "circular",
              "measurements",
              "gas",
              "lightClock",
              "circuit",
            ]),
            modelVersion: z.union([z.literal(1), z.literal(2)]),
            parameters: z.record(
              id,
              z.union([finite, z.string().max(100), z.boolean(), z.null()]),
            ),
            manualValues: z.array(finite).min(3).max(20).nullable(),
            samples: z
              .array(
                z
                  .object({
                    phase: finite.min(0).max(1),
                    values: z.record(id, finite.nullable()),
                  })
                  .strict(),
              )
              .min(2)
              .max(600),
            prediction: text.min(1),
            observations: text.min(1),
            conclusion: text.min(1),
            selfReview: z.boolean(),
            createdAt: date,
            context: z.enum(["lesson", "playground"]),
          })
          .strict(),
      )
      .max(2000)
      .default([]),
    preferences: z
      .object({
        mode: z.enum(["sequential", "review"]),
        minutes: z.number().int().min(5).max(120),
        examDate: z.iso.date().nullable(),
      })
      .strict()
      .nullable()
      .default(null),
    diagnostics: z
      .array(
        z
          .object({
            id,
            version: z.literal(1),
            phase: z.enum(["before", "after"]),
            createdAt: date,
            responses: z
              .array(
                z
                  .object({
                    questionId: id,
                    kind: z.enum(["answer", "skip", "unknown"]),
                    answer: text.nullable(),
                    at: date,
                  })
                  .strict(),
              )
              .max(9),
          })
          .strict(),
      )
      .max(200)
      .default([]),
    schemaVersion: z.literal(1),
    appVersion: id,
    contentVersions: z.record(id, z.number().int().positive()),
    profileId: id,
    exportedAt: date,
    moduleMarks: z
      .record(
        z.string(),
        z
          .object({ openedAt: date.nullable(), selfMarkedAt: date.nullable() })
          .strict(),
      )
      .default({}),
    materialOpenedAt: date.nullable(),
    selfMarkedAt: date.nullable(),
    hintHistory: z
      .record(z.string().max(150), z.number().int().min(0).max(3))
      .refine((v) => Object.keys(v).length <= 20000)
      .default({}),
    attempts: z
      .array(
        z
          .object({
            id,
            sessionId: id,
            assessmentId: id.nullable(),
            taskId: id,
            taskVersion: z.number().int().positive(),
            variantId: id,
            taskSnapshot: task,
            answer: text,
            numericAnswer: finite.nullable(),
            unit: z.string().max(20),
            hintsUsed: z.number().int().min(0).max(3),
            result: z
              .object({
                valueCorrect: z.boolean(),
                unitCorrect: z.boolean(),
                correct: z.boolean(),
                errorTags: z.array(id).max(10),
              })
              .strict(),
            submittedAt: date,
          })
          .strict(),
      )
      .max(20000),
    experiments: z
      .array(
        z
          .object({
            id,
            simulationId: z.literal("L1"),
            modelVersion: z.literal(1),
            parameterSnapshot: params,
            samples: z.array(state).min(1).max(600),
            prediction: text.min(1),
            observations: text.min(1),
            conclusion: text.min(1),
            selfReview: z.boolean(),
            createdAt: date,
            sourceKind: z.enum(["manual", "virtual"]),
            context: z.enum(["lesson", "playground"]).default("lesson"),
          })
          .strict(),
      )
      .max(2000),
  })
  .strict();
export function emptyWorkspace(): Workspace {
  return {
    visualizationExperiments: [],
    visualizations: [],
    customModules: [],
    customRuns: [],
    customRead: {},
    studyChats: [],
    schemaVersion: 1,
    appVersion: "0.2.0",
    contentVersions: {
      K1: 1,
      K2: 1,
      M1: 1,
      T1: 1,
      R1: 1,
      E1: 1,
      ...lmsVersions,
      ...dayVersions,
    },
    profileId: crypto.randomUUID(),
    exportedAt: new Date().toISOString(),
    attempts: [],
    experiments: [],
    moduleMarks: {},
    materialOpenedAt: null,
    selfMarkedAt: null,
    hintHistory: {},
    modelExperiments: [],
    diagnostics: [],
    preferences: null,
  };
}
export function validateWorkspace(input: unknown): Workspace {
  const data = schema.parse(input);
  for (const [unit, version] of Object.entries(data.contentVersions))
    if (
      (!Object.hasOwn(lmsVersions, unit) &&
        !Object.hasOwn(dayVersions, unit) &&
        !["K1", "K2", "M1", "T1", "R1", "E1"].includes(unit)) ||
      version !== 1
    )
      throw new Error("Неизвестная версия содержания");
  data.contentVersions = {
    ...lmsVersions,
    ...dayVersions,
    ...data.contentVersions,
  };
  if (data.customModules.some((m) => bundledModules.some((b) => b.id === m.id)))
    throw new Error("Импорт не может заменять поставляемый модуль курса");
  const ids = new Set<string>();
  for (const record of [
    ...data.visualizationExperiments,
    ...data.visualizations,
    ...data.customModules,
    ...data.customRuns,
    ...data.studyChats,
    ...data.attempts,
    ...data.experiments,
    ...data.modelExperiments,
    ...data.diagnostics,
  ]) {
    if (ids.has(record.id))
      throw new Error("Повторяющийся идентификатор записи");
    ids.add(record.id);
  }
  const topics = new Set([
    "K1",
    "K2",
    "M1",
    "T1",
    "R1",
    "E1",
    ...data.customModules.map((m) => m.id),
    ...bundledModules.map((m) => m.id),
  ]);
  const chatTopics = new Set<string>();
  for (const e of data.visualizationExperiments)
    if (e.topicId !== null && !topics.has(e.topicId))
      throw new Error("Неизвестный модуль исследования");
  for (const chat of data.studyChats) {
    if (!topics.has(chat.topicId) || chatTopics.has(chat.topicId))
      throw new Error("Неверная или повторная тема обсуждения");
    chatTopics.add(chat.topicId);
  }
  for (const run of data.customRuns) {
    const m = findStudyModule(data, run.moduleId);
    if (
      !m ||
      !m.questions.length ||
      run.answers.length !== m.questions.length ||
      run.answers.some((a, i) => a >= m.questions[i].options.length)
    )
      throw new Error("Неверный результат пользовательского модуля");
  }
  for (const [key, read] of Object.entries(data.customRead)) {
    const m = findStudyModule(data, key);
    if (
      !m ||
      new Set(read).size !== read.length ||
      read.some((id) => !m.sections.some((s) => s.id === id))
    )
      throw new Error("Неверная ссылка на раздел");
  }
  for (const run of data.diagnostics) {
    const seen = new Set<string>();
    for (const r of run.responses) {
      const question = [...diagnosticQuestions, diagnosticFollowup].find(
        (q) => q.id === r.questionId,
      );
      if (
        !question ||
        seen.has(r.questionId) ||
        (r.kind === "answer"
          ? !question.options.includes(r.answer ?? "")
          : r.answer !== null)
      )
        throw new Error("Неверная диагностическая запись");
      seen.add(r.questionId);
    }
  }
  for (const a of data.attempts) {
    const canonical = findTask(a.taskId, a.taskVersion);
    if (!canonical || a.variantId !== canonical.id)
      throw new Error("Неизвестная задача или версия материала");
    if (
      JSON.stringify(task.parse(canonical)) !== JSON.stringify(a.taskSnapshot)
    )
      throw new Error("Постановка задачи отличается от версии материала");
    a.result = gradeAnswer(canonical, a.answer, a.unit);
    a.numericAnswer = parseNumber(a.answer);
  }
  for (const e of data.experiments) {
    validateLinear(e.parameterSnapshot);
    if (
      e.samples[0].t !== 0 ||
      e.samples.at(-1)!.t !== e.parameterSnapshot.duration
    )
      throw new Error("Опыт должен включать начальное и конечное состояния");
    if (!e.prediction.trim() || !e.observations.trim() || !e.conclusion.trim())
      throw new Error("Пустой текст опыта");
    let previous = -1;
    for (const sample of e.samples) {
      if (sample.t <= previous) throw new Error("Нарушен порядок измерений");
      previous = sample.t;
      const expected = linearState(e.parameterSnapshot, sample.t);
      for (const key of ["x", "v", "a", "displacement", "distance"] as const)
        if (
          Math.abs(expected[key] - sample[key]) >
          Math.max(1e-9, Math.abs(expected[key]) * 1e-9)
        )
          throw new Error("Данные опыта не согласуются с моделью");
    }
  }
  for (const e of data.modelExperiments) {
    if (e.modelVersion === 2 && e.modelId !== "circular")
      throw new Error("Неизвестная версия модели");
    if (
      Object.keys(e.parameters).sort().join(",") !==
      Object.keys(modelCatalog[e.modelId].defaults).sort().join(",")
    )
      throw new Error("Неизвестные параметры модели");
    if (e.manualValues && e.modelId !== "measurements")
      throw new Error("Ручная серия доступна только измерениям");
    if (!e.prediction.trim() || !e.observations.trim() || !e.conclusion.trim())
      throw new Error("Пустая запись опыта");
    if (e.samples[0].phase !== 0 || e.samples.at(-1)!.phase !== 1)
      throw new Error("Неполная выборка опыта");
    let previous = -1;
    for (const sample of e.samples) {
      if (sample.phase <= previous) throw new Error("Порядок выборки");
      previous = sample.phase;
      const expected = evaluateModel(
        e.modelId,
        e.parameters,
        sample.phase,
        e.manualValues,
      );
      // The first circular model stored the old circular period after release.
      // Keep that immutable historical snapshot; new runs use model version 2.
      if (
        e.modelId === "circular" &&
        e.modelVersion === 1 &&
        e.parameters.releaseAt !== null &&
        sample.phase * Number(e.parameters.duration) >=
          Number(e.parameters.releaseAt)
      ) {
        expected.omega = 0;
        expected.period =
          Number(e.parameters.speed) === 0
            ? null
            : (2 * Math.PI * Number(e.parameters.radius)) /
              Number(e.parameters.speed);
      }
      if (
        Object.keys(sample.values).sort().join(",") !==
        Object.keys(expected).sort().join(",")
      )
        throw new Error("Неизвестные величины");
      for (const key of Object.keys(expected)) {
        const want = expected[key],
          got = sample.values[key];
        if (
          want === null
            ? got !== null
            : got === null ||
              Math.abs(want - got) > Math.max(1e-9, 1e-9 * Math.abs(want))
        )
          throw new Error("Несогласованные измерения");
      }
    }
  }
  return data;
}
export function validateImport(raw: string): Workspace {
  if (new TextEncoder().encode(raw).length > 10 * 1024 * 1024)
    throw new Error("Размер файла превышает 10 МБ");
  return validateWorkspace(JSON.parse(raw));
}
