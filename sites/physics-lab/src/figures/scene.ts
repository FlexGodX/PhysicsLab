import { z } from "zod";
export function evaluateExpression(
  source: string,
  values: Record<string, number>,
): number {
  if (source.length > 160 || /[^\w\s.+*/^()-]/.test(source))
    throw new Error("Недопустимая формула");
  const tokens =
    source.match(/(?:\d+(?:\.\d*)?|\.\d+)|[a-zA-Z][a-zA-Z0-9_]*|[()+*/^\-]/g) ??
    [];
  let i = 0;
  if (tokens.join("") !== source.replace(/\s/g, ""))
    throw new Error("Недопустимая формула");
  function atom(): number {
    const t = tokens[i++];
    if (t === "(") {
      const n = add();
      if (tokens[i++] !== ")") throw new Error("Скобки формулы");
      return n;
    }
    if (t && /^\d|^\./.test(t)) return Number(t);
    if (t && Object.hasOwn(values, t)) return values[t];
    throw new Error("Неизвестная величина в формуле");
  }
  function power(): number {
    let n = atom();
    if (tokens[i] === "^") {
      i++;
      n = n ** unary();
    }
    return n;
  }
  function unary(): number {
    if (tokens[i] === "-" || tokens[i] === "+") {
      const sign = tokens[i++];
      return sign === "-" ? -unary() : unary();
    }
    return power();
  }
  function mul(): number {
    let n = unary();
    while (tokens[i] === "*" || tokens[i] === "/") {
      const op = tokens[i++],
        v = unary();
      n = op === "*" ? n * v : n / v;
    }
    return n;
  }
  function add(): number {
    let n = mul();
    while (tokens[i] === "+" || tokens[i] === "-") {
      const op = tokens[i++],
        v = mul();
      n = op === "+" ? n + v : n - v;
    }
    return n;
  }
  const n = add();
  if (i !== tokens.length || !Number.isFinite(n) || Math.abs(n) > 1e12)
    throw new Error("Результат формулы вне диапазона");
  return n;
}
const finite = z.number().finite(),
  coord = finite.min(-300).max(300),
  label = z.string().trim().min(1).max(120),
  variable = z.string().regex(/^[a-z][a-z0-9_]{0,15}$/);
export const sceneSchema = z
  .object({
    controls: z
      .array(
        z
          .object({
            id: variable,
            label,
            min: finite.min(-1000),
            max: finite.max(1000),
            value: finite,
            step: finite.positive(),
          })
          .strict()
          .refine(
            (c) =>
              c.min < c.max &&
              c.value >= c.min &&
              c.value <= c.max &&
              c.step <= c.max - c.min,
          ),
      )
      .min(1)
      .max(3),
    parts: z
      .array(
        z
          .object({
            name: label,
            x: coord,
            y: coord,
            z: coord,
            w: finite.positive().max(300),
            d: finite.positive().max(300),
            h: finite.positive().max(300),
            lit: z.boolean(),
            move: z
              .object({
                control: variable,
                axis: z.enum(["x", "y", "z"]),
                scale: finite.min(-100).max(100),
              })
              .strict()
              .nullable(),
          })
          .strict(),
      )
      .min(40)
      .max(80),
    readouts: z
      .array(
        z
          .object({
            label,
            expression: z.string().min(1).max(160),
            unit: z.string().max(30),
          })
          .strict(),
      )
      .min(1)
      .max(4),
  })
  .strict()
  .superRefine((s, ctx) => {
    if (new Set(s.controls.map((c) => c.id)).size !== s.controls.length)
      ctx.addIssue({ code: "custom", message: "Повторная переменная" });
    for (const p of s.parts)
      if (p.move) {
        const c = s.controls.find((c) => c.id === p.move!.control);
        if (
          !c ||
          Math.max(
            Math.abs(c.min * p.move.scale),
            Math.abs(c.max * p.move.scale),
          ) > 400
        )
          ctx.addIssue({
            code: "custom",
            message: "Недопустимое перемещение детали",
          });
      }
    for (const r of s.readouts)
      try {
        const combinations = 3 ** s.controls.length;
        for (let i = 0; i < combinations; i++) {
          const values = Object.fromEntries(
            s.controls.map((c, j) => [
              c.id,
              [c.min, c.value, c.max][Math.floor(i / 3 ** j) % 3],
            ]),
          );
          evaluateExpression(r.expression, values);
        }
      } catch {
        ctx.addIssue({ code: "custom", message: "Неверная формула показаний" });
      }
  });
export type AnatomyScene = z.infer<typeof sceneSchema>;
