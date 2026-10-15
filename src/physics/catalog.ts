import { circularState, type CircularParams } from "./circular";
import {
  generateMeasurements,
  measurementStats,
  type MeasurementParams,
} from "./measurements";
import { gasState, type GasParams } from "./gas";
import { lightClockState, type LightClockParams } from "./lightClock";
import { circuitState, type CircuitParams } from "./circuit";
export type ModelId =
  "circular" | "measurements" | "gas" | "lightClock" | "circuit";
export type ModelParams = Record<string, number | string | boolean | null>;
export interface ParameterSpec {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  factor?: number;
}
export interface ModelDefinition {
  id: ModelId;
  title: string;
  unitId: string;
  defaults: ModelParams;
  parameters: ParameterSpec[];
  assumptions: string;
  law: string;
  question: string;
  source: string;
}
export const modelCatalog: Record<ModelId, ModelDefinition> = {
  circular: {
    id: "circular",
    title: "Движение по окружности",
    unitId: "K2",
    defaults: {
      radius: 5,
      speed: 5,
      direction: 1,
      angle: 0,
      duration: 10,
      releaseAt: null,
    },
    parameters: [
      { key: "radius", label: "Радиус R, м", min: 1, max: 10, step: 0.5 },
      {
        key: "speed",
        label: "Модуль скорости v, м/с",
        min: 0,
        max: 10,
        step: 0.5,
      },
      { key: "angle", label: "Начальный угол, °", min: 0, max: 360, step: 15 },
      { key: "duration", label: "Длительность, с", min: 1, max: 20, step: 1 },
    ],
    assumptions:
      "Горизонтальная плоскость: вертикальные силы скомпенсированы. Скорость постоянна по модулю до отпускания, затем движение по касательной без сопротивления. Свободное падение не моделируется.",
    law: "ω = ±v/R; a = v²/R; после отпускания r = r₀ + v₀Δt",
    question:
      "Куда направлены скорость и ускорение? Куда полетит точка после отпускания?",
    source:
      "https://openstax.org/books/university-physics-volume-1/pages/4-4-uniform-and-nonuniform-circular-motion",
  },
  measurements: {
    id: "measurements",
    title: "Повторные измерения",
    unitId: "M1",
    defaults: { length: 1, noise: 0.01, count: 5, bias: 0, seed: 42 },
    parameters: [
      {
        key: "length",
        label: "Истинная длина, м",
        min: 0.1,
        max: 2,
        step: 0.1,
      },
      {
        key: "noise",
        label: "Стандартное отклонение шума, м",
        min: 0.001,
        max: 0.05,
        step: 0.001,
      },
      { key: "count", label: "Число измерений", min: 3, max: 20, step: 1 },
      {
        key: "bias",
        label: "Постоянное смещение, м",
        min: -0.05,
        max: 0.05,
        step: 0.005,
      },
      {
        key: "seed",
        label: "Номер серии (seed)",
        min: 0,
        max: 4294967295,
        step: 1,
      },
    ],
    assumptions:
      "Виртуальные измерения: независимый нормальный шум и постоянное смещение. Интервал оценивает случайную составляющую. Метод не устраняет смещение; новая отдельная серия не обязана иметь более узкий интервал.",
    law: "x̄ = Σxᵢ/n; s² = Σ(xᵢ−x̄)²/(n−1); интервал x̄ ± t·s/√n",
    question:
      "Как изменятся среднее, разброс и интервал при увеличении числа измерений? Исправит ли это смещение?",
    source: "https://www.itl.nist.gov/div898/handbook/eda/section3/eda352.htm",
  },
  gas: {
    id: "gas",
    title: "Идеальный газ и энергия",
    unitId: "T1",
    defaults: {
      moles: 0.1,
      T0: 300,
      V0: 0.005,
      T1: 400,
      ratio: 2,
      process: "isochoric",
    },
    parameters: [
      {
        key: "moles",
        label: "Количество газа ν, моль",
        min: 0.05,
        max: 0.2,
        step: 0.01,
      },
      {
        key: "T0",
        label: "Начальная температура T₀, К",
        min: 250,
        max: 400,
        step: 10,
      },
      {
        key: "V0",
        label: "Начальный объём V₀, л",
        min: 5,
        max: 10,
        step: 0.5,
        factor: 0.001,
      },
      {
        key: "T1",
        label: "Конечная температура, К",
        min: 250,
        max: 500,
        step: 10,
      },
      {
        key: "ratio",
        label: "Конечный объём / начальный",
        min: 0.5,
        max: 2,
        step: 0.1,
      },
    ],
    assumptions:
      "Одноатомный идеальный газ, фиксированное количество, квазистатический процесс. Реальные газы, фазы, скорость поршня и теплоёмкость многоатомных газов не моделируются.",
    law: "pV = νRT; U = 3νRT/2; Q = ΔU + A; A = ∫p dV",
    question:
      "Какими будут знаки теплоты и работы? Куда пойдёт переданная газу энергия?",
    source:
      "https://openstax.org/books/university-physics-volume-2/pages/3-3-first-law-of-thermodynamics",
  },
  lightClock: {
    id: "lightClock",
    title: "Световые часы",
    unitId: "R1",
    defaults: { beta: 0.6, length: 0.3, ticks: 1 },
    parameters: [
      {
        key: "beta",
        label: "Относительная скорость β = v/c",
        min: 0,
        max: 0.95,
        step: 0.05,
      },
      {
        key: "length",
        label: "Расстояние между зеркалами L, м",
        min: 0.3,
        max: 1.5,
        step: 0.3,
      },
      { key: "ticks", label: "Число полных тиков", min: 1, max: 3, step: 1 },
    ],
    assumptions:
      "Инерциальные системы и постоянная относительная скорость. Гравитация, разгон и задержка сигнала до глаза не показаны. Наносекунды растянуты для просмотра.",
    law: "γ = 1/√(1−β²); τ = 2L/c; t = γτ; c = 299 792 458 м/с",
    question:
      "Какие часы измеряют собственное время? В какой системе между теми же событиями пройдёт больше времени?",
    source:
      "https://openstax.org/books/university-physics-volume-3/pages/5-3-time-dilation",
  },
  circuit: {
    id: "circuit",
    title: "Ток и сопротивление",
    unitId: "E1",
    defaults: { voltage: 6, resistance: 100, closed: true, duration: 10 },
    parameters: [
      { key: "voltage", label: "Напряжение U, В", min: 0, max: 12, step: 0.5 },
      {
        key: "resistance",
        label: "Сопротивление R, Ом",
        min: 10,
        max: 1000,
        step: 10,
      },
      {
        key: "duration",
        label: "Время наблюдения, с",
        min: 0,
        max: 60,
        step: 1,
      },
    ],
    assumptions:
      "Идеальный источник, один омический резистор и установившийся ток. Сопротивление постоянно. Переходные процессы и нагрев реального резистора не рассчитываются.",
    law: "I = U/R; P = UI; q = It; E = Pt",
    question:
      "Как изменятся ток и мощность при удвоении напряжения с тем же сопротивлением?",
    source:
      "https://openstax.org/books/university-physics-volume-2/pages/9-4-ohms-law",
  },
};
export function evaluateModel(
  id: ModelId,
  p: ModelParams,
  phase: number,
  manualValues: number[] | null = null,
): Record<string, number | null> {
  if (id === "circular") {
    const s = circularState(
      p as unknown as CircularParams,
      phase * Number(p.duration),
    );
    return {
      t: s.t,
      x: s.x,
      y: s.y,
      vx: s.vx,
      vy: s.vy,
      ax: s.ax,
      ay: s.ay,
      speed: s.speed,
      acceleration: s.acceleration,
      omega: s.omega,
      period: s.period,
    };
  }
  if (id === "measurements") {
    const s = measurementStats(
      manualValues ?? generateMeasurements(p as unknown as MeasurementParams),
    );
    return { ...s };
  }
  if (id === "gas") return { ...gasState(p as unknown as GasParams, phase) };
  if (id === "lightClock") {
    const s = lightClockState(p as unknown as LightClockParams, phase);
    return {
      gamma: s.gamma,
      properTick: s.properTick,
      labTick: s.labTick,
      properTime: s.properTime,
      labTime: s.labTime,
      x: s.x,
      y: s.y,
      lightVx: s.lightVx,
      lightVy: s.lightVy,
    };
  }
  return {
    ...circuitState(p as unknown as CircuitParams, phase * Number(p.duration)),
  };
}
export function modelSamples(
  id: ModelId,
  p: ModelParams,
  manualValues: number[] | null = null,
) {
  const phases =
    id === "measurements"
      ? [0, 1]
      : Array.from({ length: 81 }, (_, i) => i / 80);
  if (id === "circular" && p.releaseAt !== null)
    phases.push(Number(p.releaseAt) / Number(p.duration));
  if (id === "lightClock")
    for (let i = 0; i <= 2 * Number(p.ticks); i++)
      phases.push(i / (2 * Number(p.ticks)));
  return [...new Set(phases)]
    .sort((a, b) => a - b)
    .map((phase) => ({
      phase,
      values: evaluateModel(id, p, phase, manualValues),
    }));
}
