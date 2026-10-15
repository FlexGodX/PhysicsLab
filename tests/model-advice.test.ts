import { it, expect } from "vitest";
import { modelAdvice } from "../src/learning/modelAdvice";
import { modelCatalog } from "../src/physics/catalog";
it("совет соответствует покою, охлаждению, нулевому напряжению и ручной серии", () => {
  expect(
    modelAdvice(
      "lightClock",
      { ...modelCatalog.lightClock.defaults, beta: 0 },
      0,
      false,
    ),
  ).toContain("совпадают");
  expect(
    modelAdvice(
      "gas",
      { ...modelCatalog.gas.defaults, process: "isobaric", T1: 250 },
      0,
      false,
    ),
  ).toContain("охлаждается");
  expect(
    modelAdvice(
      "circuit",
      { ...modelCatalog.circuit.defaults, voltage: 0 },
      0,
      false,
    ),
  ).toContain("равен нулю");
  expect(
    modelAdvice(
      "measurements",
      { ...modelCatalog.measurements.defaults, bias: 0.03 },
      0,
      true,
    ),
  ).toContain("неизвестны");
  expect(
    modelAdvice(
      "circular",
      { ...modelCatalog.circular.defaults, releaseAt: 5 },
      0,
      false,
    ),
  ).toContain("к центру");
});
