import { it, expect } from "vitest";
import { springState, leverState } from "../src/figures/model";
it("показывает силу и энергию из одного удлинения", () => {
  expect(springState(100, 0.02)).toEqual({
    force: 2,
    energy: 0.02,
    extension: 0.02,
  });
  expect(() => springState(0, 1)).toThrow();
});
it("уравновешивает моменты рычага и отклоняет нулевое плечо", () => {
  expect(leverState(10, 0.2, 0.4)).toEqual({
    load: 10,
    effort: 5,
    torque: 2,
    left: 0.2,
    right: 0.4,
  });
  expect(() => leverState(10, 1, 0)).toThrow();
});
