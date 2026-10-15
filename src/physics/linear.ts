export interface LinearParams {
  x0: number;
  v0: number;
  a: number;
  duration: number;
}
export interface LinearState {
  t: number;
  x: number;
  v: number;
  a: number;
  displacement: number;
  distance: number;
}
export const defaultLinear: LinearParams = { x0: 0, v0: 0, a: 2, duration: 4 };
export const linearPresets: Record<string, LinearParams> = {
  Разгон: defaultLinear,
  Равномерно: { x0: 0, v0: 3, a: 0, duration: 4 },
  Торможение: { x0: 0, v0: 8, a: -2, duration: 4 },
  Разворот: { x0: 0, v0: 2, a: -1, duration: 4 },
};
export function validateLinear(p: LinearParams): void {
  for (const [key, min, max] of [
    ["x0", -20, 20],
    ["v0", -10, 10],
    ["a", -5, 5],
    ["duration", 1, 10],
  ] as const) {
    if (!Number.isFinite(p[key]) || p[key] < min || p[key] > max)
      throw new Error(`Недопустимое значение ${key}: от ${min} до ${max}`);
  }
}
export function linearState(p: LinearParams, t: number): LinearState {
  validateLinear(p);
  if (!Number.isFinite(t) || t < 0 || t > p.duration)
    throw new Error("Время вне длительности опыта");
  const displacementAt = (time: number) =>
    p.v0 * time + (p.a * time * time) / 2;
  const displacement = displacementAt(t);
  const turn = p.a === 0 ? -1 : -p.v0 / p.a;
  const distance =
    turn > 0 && turn < t
      ? Math.abs(displacementAt(turn)) +
        Math.abs(displacement - displacementAt(turn))
      : Math.abs(displacement);
  return {
    t,
    x: p.x0 + displacement,
    v: p.v0 + p.a * t,
    a: p.a,
    displacement,
    distance,
  };
}
export function linearSamples(p: LinearParams): LinearState[] {
  validateLinear(p);
  const times = Array.from({ length: 161 }, (_, i) => (p.duration * i) / 160);
  const turn = p.a === 0 ? -1 : -p.v0 / p.a;
  if (turn > 0 && turn < p.duration) times.push(turn);
  return [...new Set(times)]
    .sort((a, b) => a - b)
    .map((t) => linearState(p, t));
}
