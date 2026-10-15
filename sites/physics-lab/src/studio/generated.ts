import { moduleDraftSchema } from "./schema.ts";
export function parseGeneratedJSON(raw: string): unknown {
  const start = raw.indexOf("{");
  if (start < 0) throw new Error("Модель не вернула JSON");
  let depth = 0,
    string = false,
    escaped = false;
  for (let i = start; i < raw.length; i++) {
    const c = raw[i];
    if (string) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') string = false;
    } else if (c === '"') string = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0)
      return JSON.parse(raw.slice(start, i + 1));
  }
  throw new Error("Модель не завершила JSON");
}
export function parseGeneratedModule(raw: string) {
  const value = parseGeneratedJSON(raw) as Record<string, unknown>;
  if (Array.isArray(value.questions))
    value.questions = value.questions.map((q) => {
      if (q && typeof q === "object" && "answer" in q) {
        const { answer, ...rest } = q;
        const index = Array.isArray(rest.options)
          ? rest.options.indexOf(answer)
          : -1;
        if (
          index < 0 ||
          ("correctIndex" in rest && rest.correctIndex !== index)
        )
          throw new Error("Правильный ответ не совпадает с вариантами");
        return { ...rest, correctIndex: index };
      }
      return q;
    });
  const draft = moduleDraftSchema.parse(value);
  if (draft.questions.length < 3) throw new Error("Нужно минимум три вопроса");
  return draft;
}
