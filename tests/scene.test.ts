import { it, expect } from "vitest";
import { sceneSchema, evaluateExpression } from "../src/figures/scene";
it("вычисляет величины без исполнения кода и отклоняет недопустимые операции", () => {
  expect(evaluateExpression("k*x", { k: 100, x: 0.02 })).toBe(2);
  expect(evaluateExpression("0.5*k*x^2", { k: 100, x: 0.02 })).toBeCloseTo(
    0.02,
  );
  expect(() => evaluateExpression("alert(1)", {})).toThrow();
  expect(() => evaluateExpression("1/0", {})).toThrow();
  expect(() => evaluateExpression("window.document", {})).toThrow();
});
it("отклоняет внешние ресурсы и чрезмерный размер генерируемой сцены", () => {
  expect(() =>
    sceneSchema.parse({
      parts: [],
      controls: [],
      readouts: [],
      html: "<script/>",
    }),
  ).toThrow();
});
it("соблюдает приоритет степени перед унарным минусом", () => {
  expect(evaluateExpression("-x^2", { x: 3 })).toBe(-9);
  expect(evaluateExpression("(-x)^2", { x: 3 })).toBe(9);
  expect(evaluateExpression("2^-2", {})).toBe(0.25);
  expect(() => evaluateExpression("1_2", {})).toThrow();
});
it("проверяет ссылки движения, формулы и перенос сцены с курсом", async () => {
  const { emptyWorkspace, validateWorkspace } =
    await import("../src/persistence/schema");
  const scene = {
    controls: [
      { id: "x", label: "Путь, м", min: 0, max: 10, value: 2, step: 1 },
    ],
    parts: Array.from({ length: 40 }, (_, i) => ({
      name: `Деталь ${i}`,
      x: i,
      y: 0,
      z: 0,
      w: 1,
      d: 1,
      h: 1,
      lit: false,
      move: null,
    })),
    readouts: [{ label: "Работа", expression: "5*x", unit: "Дж" }],
  };
  const data = emptyWorkspace();
  data.visualizations = [
    {
      id: "figure",
      title: "Работа силы",
      mechanism: "custom",
      caption: "Постоянная сила 5 Н вдоль движения",
      scene,
    },
  ];
  expect(
    validateWorkspace(JSON.parse(JSON.stringify(data))).visualizations[0].scene
      ?.parts,
  ).toHaveLength(40);
  expect(() =>
    sceneSchema.parse({
      ...scene,
      parts: [
        {
          ...scene.parts[0],
          move: { control: "missing", axis: "x", scale: 1 },
        },
        ...scene.parts.slice(1),
      ],
    }),
  ).toThrow();
  expect(() =>
    sceneSchema.parse({
      ...scene,
      readouts: [
        { label: "Неверная формула", expression: "5/missing", unit: "Дж" },
      ],
    }),
  ).toThrow();
});
