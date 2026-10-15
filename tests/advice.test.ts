import { it, expect } from "vitest";
import { linearAdvice } from "../src/learning/experimentAdvice";
it("совет отличает торможение до остановки от разворота и равномерного движения", () => {
  expect(linearAdvice({ x0: 0, v0: 2, a: -1, duration: 4 }).kind).toBe("turn");
  expect(linearAdvice({ x0: 0, v0: 8, a: -2, duration: 4 }).kind).toBe("stop");
  expect(linearAdvice({ x0: 0, v0: 8, a: -1, duration: 4 }).kind).toBe(
    "braking",
  );
  expect(linearAdvice({ x0: 0, v0: 3, a: 0, duration: 4 }).kind).toBe(
    "uniform",
  );
  expect(linearAdvice({ x0: 0, v0: 0, a: 0, duration: 4 }).kind).toBe("rest");
});
