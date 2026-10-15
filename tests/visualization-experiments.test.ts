import { expect, it } from "vitest";
import {
  figureControls,
  figureValues,
  figureSeries,
  measureFigure,
  visualizationExperimentSchema,
} from "../src/figures/experiment";
import { emptyWorkspace, validateWorkspace } from "../src/persistence/schema";
import { achievements, allProgress } from "../src/learning/review";

const spring = {
  id: "figure",
  title: "Пружина",
  mechanism: "spring" as const,
  caption: "Идеальная пружина",
  sourcePrompt: "Покажи закон Гука",
};
const at = "2026-10-15T21:00:00.000Z";
function experiment() {
  return {
    id: "research",
    modelVersion: 1 as const,
    figureSnapshot: spring,
    topicId: "K1",
    question: "Как меняется сила?",
    prediction: "Сила удвоится",
    samples: [
      { parameters: { x: 20, k: 100 }, readings: [2, 0.02], capturedAt: at },
      { parameters: { x: 40, k: 100 }, readings: [4, 0.08], capturedAt: at },
    ],
    observations: "Сила стала 4 Н",
    conclusion: "При том же k сила пропорциональна x",
    selfReview: true,
    createdAt: at,
    context: "playground" as const,
  };
}
it("единое состояние связывает органы управления и измерения пружины и рычага", () => {
  expect(figureValues(spring)).toEqual({ x: 20, k: 100 });
  expect(figureControls(spring).map((c) => c.id)).toEqual(["x", "k"]);
  expect(measureFigure(spring, { x: 40, k: 100 }).map((r) => r.value)).toEqual([
    4, 0.08,
  ]);
  expect(
    measureFigure({ ...spring, mechanism: "lever" }, { l: 40 })[0].value,
  ).toBe(5);
  const invalid: Record<string, number>[] = [
    { x: 101, k: 100 },
    { x: 20 },
    { x: 20, k: 100, other: 1 },
    { x: NaN, k: 100 },
  ];
  for (const p of invalid) expect(() => measureFigure(spring, p)).toThrow();
});
it("custom использует формулу сцены, отмечая неопределённое внутреннее состояние", () => {
  const figure = {
    ...spring,
    mechanism: "custom" as const,
    scene: {
      controls: [
        { id: "x", label: "Положение", min: 0, max: 2, value: 0, step: 0.1 },
      ],
      parts: Array.from({ length: 40 }, (_, i) => ({
        name: `Деталь ${i}`,
        x: i,
        y: 0,
        z: 0,
        w: 1,
        d: 1,
        h: 1,
        lit: false,
        move: null,
      })),
      readouts: [{ label: "Значение", expression: "1/(x-1)", unit: "м" }],
    },
  };
  expect(measureFigure(figure, { x: 2 })[0].value).toBe(1);
  expect(measureFigure(figure, { x: 1 })[0].value).toBeNull();
});
it("серия меняет один параметр с допустимым шагом и сохраняет остальные", () => {
  const values = { x: 40, k: 100 };
  const series = figureSeries(spring, values, "x");
  expect(series).toHaveLength(11);
  expect(series[0]).toEqual({ x: 0, k: 100 });
  expect(series.at(-1)).toEqual({ x: 100, k: 100 });
  expect(values).toEqual({ x: 40, k: 100 });
  const custom = {
    ...spring,
    mechanism: "custom" as const,
    scene: {
      controls: [
        { id: "x", label: "Путь", min: 0, max: 10, value: 0, step: 4 },
      ],
      parts: [],
      readouts: [{ label: "Путь", expression: "x", unit: "м" }],
    },
  };
  expect(figureSeries(custom, { x: 0 }, "x")).toEqual([
    { x: 0 },
    { x: 4 },
    { x: 8 },
  ]);
  expect(() => figureSeries(spring, values, "missing")).toThrow();
});
it("переносит независимый снимок исследования и мигрирует раннюю копию", () => {
  const data = emptyWorkspace();
  data.visualizationExperiments = [experiment()];
  const copy = validateWorkspace(JSON.parse(JSON.stringify(data)));
  expect(copy.visualizationExperiments).toEqual(data.visualizationExperiments);
  expect(copy.visualizations).toEqual([]);
  const old = { ...data } as Record<string, unknown>;
  delete old.visualizationExperiments;
  expect(validateWorkspace(old).visualizationExperiments).toEqual([]);
});
it("не принимает подмену показаний, диапазонов, текста, ссылок и повторные записи", () => {
  const e = experiment();
  expect(visualizationExperimentSchema.parse(e)).toEqual(e);
  for (const changed of [
    {
      ...e,
      samples: [{ ...e.samples[0], readings: [200, 0.02] }, e.samples[1]],
    },
    {
      ...e,
      samples: [
        { ...e.samples[0], parameters: { x: 500, k: 100 } },
        e.samples[1],
      ],
    },
    {
      ...e,
      samples: [{ ...e.samples[0], readings: [null, 0.02] }, e.samples[1]],
    },
    { ...e, samples: [e.samples[0]] },
    { ...e, prediction: "  " },
    { ...e, topicId: "missing" },
  ])
    expect(() =>
      validateWorkspace({
        ...emptyWorkspace(),
        visualizationExperiments: [changed],
      }),
    ).toThrow();
  expect(() =>
    validateWorkspace({
      ...emptyWorkspace(),
      visualizationExperiments: [e, e],
    }),
  ).toThrow();
});
it("учитывает исследование как опыт с выводом, не присваивая освоение темы", () => {
  const data = emptyWorkspace();
  data.visualizationExperiments = [experiment()];
  expect(
    achievements(data).find((a) => a.id === "experiment")?.evidenceIds,
  ).toEqual(["research"]);
  expect(allProgress(data).some((p) => p.demonstrated)).toBe(false);
});
