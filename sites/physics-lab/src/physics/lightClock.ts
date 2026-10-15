import { inRange, integerRange } from "./ranges";
export const C = 299792458;
export interface LightClockParams {
  beta: number;
  length: number;
  ticks: number;
}
export function lightClockState(p: LightClockParams, phase: number) {
  inRange(p.beta, 0, 0.95, "β");
  inRange(p.length, 0.3, 1.5, "Расстояние зеркал");
  integerRange(p.ticks, 1, 3, "Число тиков");
  inRange(phase, 0, 1, "Ход демонстрации");
  const gamma = 1 / Math.sqrt(1 - p.beta ** 2),
    properTick = (2 * p.length) / C,
    labTick = gamma * properTick;
  const properTime = phase * p.ticks * properTick,
    labTime = gamma * properTime;
  const cycle = (phase * p.ticks) % 1;
  const up = cycle < 0.5;
  const y = p.length * (up ? cycle * 2 : 2 - cycle * 2);
  return {
    phase,
    gamma,
    properTick,
    labTick,
    properTime,
    labTime,
    x: p.beta * C * labTime,
    y,
    lightVx: p.beta * C,
    lightVy: ((up ? 1 : -1) * C) / gamma,
    clockLightVy: (up ? 1 : -1) * C,
    events: Array.from({ length: p.ticks * 2 + 1 }, (_, i) => ({
      name: i === 0 ? "Испускание" : i % 2 ? "Отражение" : "Возврат",
      properTime: (i * properTick) / 2,
      labTime: (i * labTick) / 2,
      phase: i / (p.ticks * 2),
    })),
  };
}
