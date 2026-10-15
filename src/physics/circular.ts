import { inRange } from "./ranges";
export interface CircularParams {
  radius: number;
  speed: number;
  direction: number;
  angle: number;
  duration: number;
  releaseAt: number | null;
}
export function circularState(p: CircularParams, t: number) {
  inRange(p.radius, 1, 10, "Радиус");
  inRange(p.speed, 0, 10, "Скорость");
  inRange(p.angle, 0, 360, "Угол");
  inRange(p.duration, 1, 20, "Длительность");
  inRange(t, 0, p.duration, "Время");
  if (p.direction !== 1 && p.direction !== -1)
    throw new Error("Направление должно быть ±1");
  if (p.releaseAt !== null) inRange(p.releaseAt, 0, p.duration, "Отпускание");
  const released = p.releaseAt !== null && t >= p.releaseAt;
  const circleTime = released ? p.releaseAt! : t;
  const omega = (p.direction * p.speed) / p.radius;
  const theta = (p.angle * Math.PI) / 180 + omega * circleTime;
  const vx = -p.radius * omega * Math.sin(theta),
    vy = p.radius * omega * Math.cos(theta);
  const dt = t - circleTime;
  return {
    t,
    x: p.radius * Math.cos(theta) + vx * dt,
    y: p.radius * Math.sin(theta) + vy * dt,
    vx,
    vy,
    ax: released ? 0 : (-(p.speed ** 2) / p.radius) * Math.cos(theta),
    ay: released ? 0 : (-(p.speed ** 2) / p.radius) * Math.sin(theta),
    acceleration: released ? 0 : p.speed ** 2 / p.radius,
    speed: p.speed,
    omega: released ? null : omega,
    period: p.speed === 0 || released ? null : (2 * Math.PI * p.radius) / p.speed,
    released,
  };
}
