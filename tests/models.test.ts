import { it, expect } from "vitest";
import { circularState } from "../src/physics/circular";
import {
  measurementStats,
  generateMeasurements,
  roundedMeasurement,
} from "../src/physics/measurements";
import { gasState } from "../src/physics/gas";
import { lightClockState, C } from "../src/physics/lightClock";
import { circuitState } from "../src/physics/circuit";
it("окружность: векторы, масштаб ускорения, отсутствие вращения", () => {
  const p = {
    radius: 5,
    speed: 5,
    direction: 1,
    angle: 0,
    duration: 10,
    releaseAt: null,
  };
  const s = circularState(p, 0);
  expect(s).toMatchObject({ x: 5, y: 0, vy: 5, ax: -5, acceleration: 5 });
  expect(circularState({ ...p, speed: 10 }, 0).acceleration).toBe(20);
  expect(circularState({ ...p, radius: 10 }, 0).acceleration).toBe(2.5);
  expect(circularState({ ...p, speed: 0 }, 0).period).toBeNull();
  const q = circularState(p, 2);
  expect(q.x * q.vx + q.y * q.vy).toBeCloseTo(0, 9);
});
it("отпускание сохраняет положение и скорость, отключает ускорение", () => {
  const p = {
    radius: 5,
    speed: 5,
    direction: -1,
    angle: 0,
    duration: 10,
    releaseAt: 2,
  };
  const before = circularState({ ...p, releaseAt: null }, 2);
  const released = circularState(p, 2);
  const after = circularState(p, 3);
  expect(released.x).toBe(before.x);
  expect(released.vy).toBe(before.vy);
  expect(released.acceleration).toBe(0);
  expect(after.x).toBeCloseTo(before.x + before.vx, 10);
});
it("измерения: контрольный интервал, округление, нулевое среднее и постоянная серия", () => {
  const s = measurementStats([0.99, 1, 1.01]);
  expect(s.mean).toBe(1);
  expect(s.s).toBeCloseTo(0.01, 12);
  expect(s.sem).toBeCloseTo(0.00577350269, 10);
  expect(s.halfWidth).toBeCloseTo(0.024841, 5);
  expect(roundedMeasurement(s)).toBe("1,000 ± 0,025 м");
  expect(measurementStats([-1, 0, 1]).relative).toBeNull();
  expect(measurementStats([1, 1, 1]).halfWidth).toBe(0);
  expect(() => measurementStats([1, 2])).toThrow();
});
it("генератор воспроизводит seed и систематическое смещение", () => {
  const p = { length: 1, noise: 0.01, count: 5, bias: 0, seed: 42 };
  const values = generateMeasurements(p);
  expect(generateMeasurements(p)).toEqual(values);
  const shifted = generateMeasurements({ ...p, bias: 0.02 });
  shifted.forEach((v, i) => expect(v - values[i]).toBeCloseTo(0.02, 12));
});
it("газ: эталоны и энергетический баланс во всех процессах", () => {
  const p = {
    moles: 0.1,
    T0: 300,
    V0: 0.005,
    T1: 400,
    ratio: 2,
    process: "isochoric" as const,
  };
  const s = gasState(p, 1);
  expect(s.work).toBe(0);
  expect(s.heat).toBeCloseTo(124.7169392722986, 9);
  const bar = gasState({ ...p, process: "isobaric" }, 1);
  expect(bar.work).toBeCloseTo(83.1446261815324, 9);
  expect(bar.heat).toBeCloseTo(207.861565453831, 9);
  for (const process of ["isochoric", "isobaric", "isothermal"] as const)
    for (const phase of [0, 0.4, 1]) {
      const a = gasState({ ...p, process }, phase);
      expect(a.pressure * a.volume).toBeCloseTo(
        p.moles * 8.31446261815324 * a.temperature,
        9,
      );
      expect(a.heat - a.deltaU - a.work).toBeCloseTo(0, 9);
    }
  expect(
    gasState({ ...p, process: "isothermal", ratio: 0.5 }, 1),
  ).toMatchObject({ deltaU: 0 });
  expect(
    gasState({ ...p, process: "isothermal", ratio: 0.5 }, 1).work,
  ).toBeLessThan(0);
});
it("часы: одни события в двух системах, скорость света и недопустимая beta", () => {
  const p = { beta: 0.6, length: 0.3, ticks: 1 };
  const s = lightClockState(p, 1);
  expect(s.gamma).toBe(1.25);
  expect(s.properTick * 1e9).toBeCloseTo(2.0013846, 6);
  expect(s.labTick * 1e9).toBeCloseTo(2.5017307, 6);
  expect(Math.hypot(s.lightVx, s.lightVy)).toBeCloseTo(C, 6);
  expect(lightClockState({ ...p, beta: 0 }, 0.5).gamma).toBe(1);
  expect(lightClockState({ ...p, beta: 0.8 }, 0).gamma).toBeCloseTo(5 / 3, 12);
  expect(() => lightClockState({ ...p, beta: 1 }, 0)).toThrow();
  expect(lightClockState(p, 0.5).y).toBeCloseTo(0.3, 12);
  expect(s.y).toBeCloseTo(0, 12);
});
it("цепь: закон Ома, энергия, разрыв, нулевое напряжение и запрет R≤0", () => {
  const p = { voltage: 6, resistance: 100, closed: true, duration: 60 };
  expect(circuitState(p, 10)).toMatchObject({ current: 0.06, power: 0.36 });
  expect(circuitState(p, 10).energy).toBeCloseTo(3.6, 12);
  expect(circuitState({ ...p, closed: false }, 10).current).toBe(0);
  expect(circuitState({ ...p, voltage: 0 }, 10).power).toBe(0);
  expect(() => circuitState({ ...p, resistance: 0 }, 10)).toThrow();
  expect(circuitState({ ...p, voltage: 12 }, 10).power).toBe(1.44);
});
it('после отпускания период кругового движения больше не определён',()=>{expect(circularState({radius:5,speed:5,direction:1,angle:0,duration:10,releaseAt:2},3).period).toBeNull();});
