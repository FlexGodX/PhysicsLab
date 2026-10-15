export function parseNumber(raw: string): number | null {
  const text = raw.trim().replace(",", ".");
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text))
    return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}
const units: Record<string, [string, number]> = {
  "1": ["dimensionless", 1],
  "рад/с": ["angular-speed", 1],
  Дж: ["energy", 1],
  К: ["temperature", 1],
  Па: ["pressure", 1],
  кПа: ["pressure", 1000],
  л: ["volume", 0.001],
  "м³": ["volume", 1],
  А: ["current", 1],
  мА: ["current", 0.001],
  В: ["voltage", 1],
  Ом: ["resistance", 1],
  Вт: ["power", 1],
  Кл: ["charge", 1],
  нс: ["time", 1e-9],
  моль: ["amount", 1],
  м: ["length", 1],
  см: ["length", 0.01],
  км: ["length", 1000],
  "м/с": ["speed", 1],
  "км/ч": ["speed", 1 / 3.6],
  "м/с²": ["acceleration", 1],
  с: ["time", 1],
};
export function convertUnit(
  value: number,
  from: string,
  to: string,
): number | null {
  if (
    !Number.isFinite(value) ||
    !Object.hasOwn(units, from) ||
    !Object.hasOwn(units, to)
  )
    return null;
  const source = units[from];
  const target = units[to];
  return source && target && source[0] === target[0]
    ? (value * source[1]) / target[1]
    : null;
}
export const formatNumber = (value: number, digits = 2): string =>
  value.toLocaleString("ru-RU", { maximumFractionDigits: digits });
