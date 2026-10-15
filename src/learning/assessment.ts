import { convertUnit, parseNumber } from "../physics/units";
import type { Attempt, Grade, TaskVariant } from "../content/types";
export function gradeAnswer(
  task: TaskVariant,
  answer: string,
  unit: string,
): Grade {
  const numeric = typeof task.answer === "number";
  const value = numeric ? parseNumber(answer) : null;
  const converted =
    numeric && value !== null ? convertUnit(value, unit, task.unit!) : null;
  const unitCorrect = !numeric || converted !== null;
  const valueCorrect = numeric
    ? value !== null &&
      Math.abs((converted ?? value) - (task.answer as number)) <=
        (Number.isInteger(task.answer) ? 0 : Math.abs(task.answer as number) * 0.01) + 1e-9
    : answer === task.answer;
  return {
    valueCorrect,
    unitCorrect,
    correct: valueCorrect && unitCorrect,
    errorTags: [
      ...(!valueCorrect ? [task.errorTag] : []),
      ...(!unitCorrect ? ["unit_mismatch"] : []),
    ],
  };
}
export function makeAttempt(
  task: TaskVariant,
  answer: string,
  unit: string,
  hintsUsed: number,
  assessmentId: string | null,
  submittedAt = new Date().toISOString(),
): Attempt {
  return {
    id: crypto.randomUUID(),
    sessionId: assessmentId ?? crypto.randomUUID(),
    assessmentId,
    taskId: task.id,
    taskVersion: task.version,
    variantId: task.id,
    taskSnapshot: structuredClone(task),
    answer,
    numericAnswer: parseNumber(answer),
    unit,
    hintsUsed,
    result: gradeAnswer(task, answer, unit),
    submittedAt,
  };
}
