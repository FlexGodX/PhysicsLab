import { learningUnits, type ExtraUnitId } from "../content/modules";
import type { Workspace } from "../content/types";
import { deriveProgress } from "./progress";
import { deriveUnitProgress } from "./unitProgress";
export type UnitId = "K1" | ExtraUnitId;
export const unitIds: UnitId[] = ["K1", "K2", "M1", "T1", "R1", "E1"];
export const unitTitle = (id: UnitId) =>
  id === "K1" ? "Прямая и графики" : learningUnits[id].title;
export const attemptUnit = (taskId: string): UnitId =>
  unitIds.find((id) => taskId.startsWith(id + "-")) ?? "K1";
export function allProgress(data: Workspace, now = new Date().toISOString()) {
  return unitIds.map((id) => ({
    id,
    ...(id === "K1"
      ? deriveProgress(data.attempts, data.experiments, now)
      : deriveUnitProgress(id, data.attempts, data.modelExperiments, now)),
  }));
}
export function reviewQueue(data: Workspace, now = new Date().toISOString()) {
  const progress = allProgress(data, now);
  const queue: {
    unitId: UnitId;
    reason: "overdue" | "error" | "new";
    detail: string;
  }[] = [];
  for (const p of progress
    .filter((p) => p.nextReviewAt && p.nextReviewAt <= now)
    .sort((a, b) => a.nextReviewAt!.localeCompare(b.nextReviewAt!)))
    queue.push({
      unitId: p.id,
      reason: "overdue",
      detail:
        "Наступил срок повторения. Прежнее подтверждение остаётся в истории.",
    });
  const latest = new Map<string, Workspace["attempts"][number]>();
  for (const a of [...data.attempts].sort((a, b) =>
    a.submittedAt.localeCompare(b.submittedAt),
  ))
    latest.set(a.taskSnapshot.templateId, a);
  for (const a of [...latest.values()].sort((a, b) =>
    b.submittedAt.localeCompare(a.submittedAt),
  ))
    if (
      (!a.result.correct || a.hintsUsed > 0) &&
      !queue.some((q) => q.unitId === attemptUnit(a.taskId))
    )
      queue.push({
        unitId: attemptUnit(a.taskId),
        reason: "error",
        detail: a.taskSnapshot.hints[0],
      });
  for (const p of progress)
    if (p.reviewNeeded && !queue.some((q) => q.unitId === p.id))
      queue.push({
        unitId: p.id,
        reason: "error",
        detail:
          "Последняя проверка показала пробел. Повторите объяснение и решите другой вариант.",
      });
  for (const p of progress)
    if (!p.demonstrated && !queue.some((q) => q.unitId === p.id))
      queue.push({
        unitId: p.id,
        reason: "new",
        detail: "Начните с короткого объяснения и прогноза опыта.",
      });
  return queue.slice(0, 3);
}
export interface Achievement {
  id: string;
  title: string;
  evidenceIds: string[];
  awardedAt: string;
  ruleVersion: 1;
}
export function achievements(data: Workspace): Achievement[] {
  const records: Achievement[] = [];
  const attempts = [...data.attempts].sort((a, b) =>
    a.submittedAt.localeCompare(b.submittedAt),
  );
  const add = (
    id: string,
    title: string,
    evidenceIds: string[],
    awardedAt: string,
  ) => records.push({ id, title, evidenceIds, awardedAt, ruleVersion: 1 });
  const first = attempts.find(
    (a) =>
      a.result.correct && !a.hintsUsed && a.taskSnapshot.kind === "calculation",
  );
  if (first)
    add(
      "independent",
      "Первое самостоятельное решение",
      [first.id],
      first.submittedAt,
    );
  const experiment = [
    ...data.experiments,
    ...data.modelExperiments,
    ...data.visualizationExperiments,
  ]
    .filter(
      (e) =>
        e.prediction.trim() && e.observations.trim() && e.conclusion.trim(),
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
  if (experiment)
    add(
      "experiment",
      "Опыт с собственным выводом",
      [experiment.id],
      experiment.createdAt,
    );
  for (const a of attempts) {
    const previous = attempts.find(
      (b) =>
        b.submittedAt < a.submittedAt &&
        !b.result.correct &&
        b.taskSnapshot.templateId === a.taskSnapshot.templateId &&
        b.variantId !== a.variantId,
    );
    if (a.result.correct && !a.hintsUsed && previous) {
      add(
        "recovery",
        "Исправленная ошибка",
        [previous.id, a.id],
        a.submittedAt,
      );
      break;
    }
  }
  const repeats = allProgress(data)
    .flatMap((p) => {
      const successes = p.checks.filter((c) => c.pass);
      const first = successes[0];
      return first
        ? successes
            .filter((c) => Date.parse(c.at) - Date.parse(first.at) >= 86400000)
            .map((c) => ({
              unitId: p.id,
              firstId: first.assessmentId,
              reviewId: c.assessmentId,
              at: c.at,
            }))
        : [];
    })
    .sort((a, b) => a.at.localeCompare(b.at));
  const repeated = repeats[0];
  if (repeated)
    add(
      "review",
      "Знание через сутки",
      attempts
        .filter(
          (a) =>
            attemptUnit(a.taskId) === repeated.unitId &&
            a.assessmentId &&
            (a.assessmentId === repeated.reviewId ||
              a.assessmentId === repeated.firstId),
        )
        .map((a) => a.id),
      repeated.at,
    );
  return records;
}
