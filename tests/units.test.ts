import { it, expect } from "vitest";
import { parseNumber, convertUnit } from "../src/physics/units";
it("читает запятую и точку, не подменяет пустое значение или мусор нулём", () => {
  expect(parseNumber(" 1,25 ")).toBe(1.25);
  expect(parseNumber("-0.5")).toBe(-0.5);
  for (const raw of [
    "",
    " ",
    "Infinity",
    "NaN",
    "1,2,3",
    "2 метра",
    "0x10",
    "1e999",
  ])
    expect(parseNumber(raw)).toBeNull();
});
it("преобразует только совместимые единицы", () => {
  expect(convertUnit(400, "см", "м")).toBe(4);
  expect(convertUnit(4, "м/с²", "м/с")).toBeNull();
  expect(convertUnit(36, "км/ч", "м/с")).toBe(10);
});
it("отклоняет неизвестные имена единиц, включая свойства прототипа", () => {
  expect(convertUnit(1, "constructor", "constructor")).toBeNull();
  expect(convertUnit(1, "__proto__", "__proto__")).toBeNull();
});
