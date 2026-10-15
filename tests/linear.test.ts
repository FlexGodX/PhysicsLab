import { describe, it, expect } from "vitest";
import {
  linearState,
  linearSamples,
  defaultLinear,
} from "../src/physics/linear";
describe("Прямолинейное движение", () => {
  it("согласует скорость, путь и расстояния по секундам", () => {
    expect(linearState(defaultLinear, 4)).toMatchObject({
      x: 16,
      v: 8,
      distance: 16,
      displacement: 16,
    });
    expect(
      [1, 2, 3, 4].map(
        (t) =>
          linearState(defaultLinear, t).distance -
          linearState(defaultLinear, t - 1).distance,
      ),
    ).toEqual([1, 3, 5, 7]);
  });
  it("суммирует путь по обе стороны разворота", () => {
    expect(linearState({ ...defaultLinear, v0: 2, a: -1 }, 4)).toMatchObject({
      distance: 4,
      displacement: 0,
      v: -2,
    });
  });
  it("обрабатывает равномерное движение, отрицательную скорость и остановку", () => {
    expect(linearState({ ...defaultLinear, v0: -3, a: 0 }, 4)).toMatchObject({
      x: -12,
      distance: 12,
    });
    expect(linearState({ ...defaultLinear, v0: 4, a: -1 }, 4)).toMatchObject({
      v: 0,
      distance: 8,
    });
  });
  it("отклоняет недопустимые параметры и время", () => {
    for (const p of [
      { ...defaultLinear, a: Infinity },
      { ...defaultLinear, v0: 11 },
      { ...defaultLinear, duration: 0 },
    ])
      expect(() => linearState(p, 0)).toThrow();
    expect(() => linearState(defaultLinear, 5)).toThrow();
    expect(() => linearState(defaultLinear, NaN)).toThrow();
  });
  it("включает точный разворот и ограничивает график", () => {
    const samples = linearSamples({ ...defaultLinear, v0: 1, a: -3 });
    expect(samples.some((s) => s.t === 1 / 3)).toBe(true);
    expect(samples.length).toBeLessThanOrEqual(600);
    expect(
      samples.every((s) => s.distance + 1e-10 >= Math.abs(s.displacement)),
    ).toBe(true);
  });
});
