export function inRange(
  value: number,
  min: number,
  max: number,
  name: string,
): number {
  if (!Number.isFinite(value) || value < min || value > max)
    throw new Error(`${name}: допустимо от ${min} до ${max}`);
  return value;
}
export function integerRange(
  value: number,
  min: number,
  max: number,
  name: string,
): number {
  inRange(value, min, max, name);
  if (!Number.isInteger(value))
    throw new Error(`${name}: требуется целое число`);
  return value;
}
