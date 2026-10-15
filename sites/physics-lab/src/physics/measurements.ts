import { inRange, integerRange } from "./ranges";
// NIST t(0.975, n−1), table version 2026-10-15, n = 3…20.
const student = [
  4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201, 2.179,
  2.16, 2.145, 2.131, 2.12, 2.11, 2.101, 2.093,
];
export function measurementStats(values: number[]) {
  integerRange(values.length, 3, 20, "Число измерений");
  values.forEach((v) => inRange(v, -1e6, 1e6, "Измерение"));
  const n = values.length,
    mean = values.reduce((a, b) => a + b, 0) / n;
  const s = Math.sqrt(
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (n - 1),
  );
  const sem = s / Math.sqrt(n),
    coefficient = student[n - 3],
    halfWidth = coefficient * sem;
  return {
    n,
    mean,
    s,
    sem,
    coefficient,
    halfWidth,
    lower: mean - halfWidth,
    upper: mean + halfWidth,
    relative: mean === 0 ? null : halfWidth / Math.abs(mean),
  };
}
export function roundedMeasurement(
  s: ReturnType<typeof measurementStats>,
): string {
  if (s.halfWidth === 0)
    return `${s.mean.toLocaleString("ru-RU", { maximumFractionDigits: 8 })} ± 0 м`;
  const place = 10 ** (Math.floor(Math.log10(s.halfWidth)) - 1);
  const rounded = Math.ceil(s.halfWidth / place - 1e-12) * place;
  const digits = Math.max(0, Math.min(12, -Math.floor(Math.log10(place))));
  return `${s.mean.toFixed(digits).replace(".", ",")} ± ${rounded.toFixed(digits).replace(".", ",")} м`;
}
export interface MeasurementParams {
  length: number;
  noise: number;
  count: number;
  bias: number;
  seed: number;
}
export function generateMeasurements(p: MeasurementParams): number[] {
  inRange(p.length, 0.1, 2, "Длина");
  inRange(p.noise, 0.001, 0.05, "Шум");
  integerRange(p.count, 3, 20, "Число измерений");
  inRange(p.bias, -0.05, 0.05, "Смещение");
  integerRange(p.seed, 0, 4294967295, "Seed");
  let state = p.seed >>> 0;
  const uniform = () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return (state + 0.5) / 4294967296;
  };
  return Array.from(
    { length: p.count },
    () =>
      p.length +
      p.bias +
      p.noise *
        Math.sqrt(-2 * Math.log(uniform())) *
        Math.cos(2 * Math.PI * uniform()),
  );
}
