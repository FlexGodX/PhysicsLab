import { z } from "zod";
import { visualizationSchema } from "../studio/schema";
import { evaluateExpression } from "./scene";
import { springState, leverState } from "./model";

export type FigureSpec = z.infer<typeof visualizationSchema>;
export type FigureControl = {
  id: string;
  label: string;
  min: number;
  max: number;
  value: number;
  step: number;
};
export type FigureReading = {
  label: string;
  unit: string;
  value: number | null;
};
export function figureControls(figure: FigureSpec): FigureControl[] {
  if (figure.mechanism === "custom") {
    if (!figure.scene) throw new Error("Отсутствует модель визуализации");
    return figure.scene.controls;
  }
  return figure.mechanism === "spring"
    ? [
        {
          id: "x",
          label: "Удлинение, мм",
          min: 0,
          max: 100,
          value: 20,
          step: 1,
        },
        {
          id: "k",
          label: "Жёсткость, Н/м",
          min: 20,
          max: 200,
          value: 100,
          step: 10,
        },
      ]
    : [
        {
          id: "l",
          label: "Правое плечо, см",
          min: 10,
          max: 40,
          value: 30,
          step: 1,
        },
      ];
}
export function figureValues(figure: FigureSpec): Record<string, number> {
  return Object.fromEntries(figureControls(figure).map((c) => [c.id, c.value]));
}
export function figureSeries(
  figure: FigureSpec,
  parameters: Record<string, number>,
  variable: string,
): Record<string, number>[] {
  measureFigure(figure, parameters);
  const c = figureControls(figure).find((c) => c.id === variable);
  if (!c) throw new Error("Неизвестный параметр серии");
  const steps = Math.floor((c.max - c.min) / c.step + 1e-10);
  const positions = Array.from({ length: 11 }, (_, i) => {
    const offset = Math.min(
      steps,
      Math.round(((c.max - c.min) * i) / 10 / c.step),
    );
    const n = Number.isFinite(offset)
      ? c.min + offset * c.step
      : c.min + ((c.max - c.min) * i) / 10;
    return Math.max(c.min, Math.min(c.max, Number(n.toPrecision(14))));
  });
  return [...new Set(positions)].map((n) => ({ ...parameters, [variable]: n }));
}
export function measureFigure(
  figure: FigureSpec,
  parameters: Record<string, number>,
): FigureReading[] {
  const controls = figureControls(figure);
  if (
    Object.keys(parameters).length !== controls.length ||
    controls.some(
      (c) =>
        !Object.hasOwn(parameters, c.id) ||
        !Number.isFinite(parameters[c.id]) ||
        parameters[c.id] < c.min ||
        parameters[c.id] > c.max,
    )
  )
    throw new Error("Параметры визуализации вне диапазона");
  if (figure.mechanism === "spring") {
    const state = springState(parameters.k, parameters.x / 1000);
    return [
      { label: "Сила", unit: "Н", value: state.force },
      { label: "Энергия", unit: "Дж", value: state.energy },
    ];
  }
  if (figure.mechanism === "lever") {
    const state = leverState(10, 0.2, parameters.l / 100);
    return [
      { label: "Усилие", unit: "Н", value: state.effort },
      { label: "Момент слева", unit: "Н·м", value: state.torque },
    ];
  }
  return figure.scene!.readouts.map((r) => {
    let value: number | null;
    try {
      value = evaluateExpression(r.expression, parameters);
    } catch {
      value = null;
    }
    return { label: r.label, unit: r.unit, value };
  });
}
const note = z.string().trim().min(1).max(4000);
export const visualizationSampleSchema = z
  .object({
    parameters: z.record(z.string().min(1).max(100), z.number().finite()),
    readings: z.array(z.number().finite().nullable()).min(1).max(4),
    capturedAt: z.iso.datetime(),
  })
  .strict();
export type VisualizationSample = z.infer<typeof visualizationSampleSchema>;
export const visualizationExperimentSchema = z
  .object({
    id: z.string().min(1).max(100),
    modelVersion: z.literal(1),
    figureSnapshot: visualizationSchema,
    topicId: z.string().min(1).max(100).nullable(),
    question: note,
    prediction: note,
    samples: z.array(visualizationSampleSchema).min(2).max(200),
    observations: note,
    conclusion: note,
    selfReview: z.boolean(),
    createdAt: z.iso.datetime(),
    context: z.literal("playground"),
  })
  .strict()
  .superRefine((e, ctx) => {
    let previous = -Infinity;
    for (const sample of e.samples) {
      try {
        const expected = measureFigure(e.figureSnapshot, sample.parameters);
        if (
          Date.parse(sample.capturedAt) < previous ||
          expected.length !== sample.readings.length ||
          expected.some((r, i) =>
            r.value === null
              ? sample.readings[i] !== null
              : sample.readings[i] === null ||
                Math.abs(r.value - sample.readings[i]!) >
                  Math.max(1e-9, Math.abs(r.value) * 1e-9),
          )
        )
          throw new Error("Несогласованные измерения визуализации");
        previous = Date.parse(sample.capturedAt);
      } catch {
        ctx.addIssue({
          code: "custom",
          message: "Измерения не согласуются со снимком визуализации",
        });
        break;
      }
    }
  });
export type VisualizationExperiment = z.infer<
  typeof visualizationExperimentSchema
>;
