import type { Attempt, Experiment } from "../content/types";
import { k1Tasks, k1Outcomes } from "../content/k1";
import { gradeAnswer } from "./assessment";
export function deriveProgress(
  attempts: Attempt[],
  experiments: Experiment[],
  now = new Date().toISOString(),
) {
  const groups = new Map<string, Attempt[]>();
  for (const a of attempts)
    if (a.assessmentId && k1Tasks.some((t) => t.id === a.taskId))
      groups.set(a.assessmentId, [...(groups.get(a.assessmentId) ?? []), a]);
  const checks = [...groups.values()]
    .filter((group) => group.length === 5)
    .map((group) => {
      const templates = new Set<string>();
      const outcomes = new Set<string>();
      let score = 0;
      let critical = true;
      let independent = true;
      for (const a of group) {
        const task = k1Tasks.find(
          (t) => t.id === a.taskId && t.version === a.taskVersion,
        );
        if (!task) {
          critical = false;
          continue;
        }
        templates.add(task.templateId);
        const correct = gradeAnswer(task, a.answer, a.unit).correct;
        if (correct) {
          score++;
          task.outcomeIds.forEach((id) => outcomes.add(id));
        }
        if (task.critical && !correct) critical = false;
        if (a.hintsUsed > 0) independent = false;
      }
      const valid = [
        "displacement",
        "direction",
        "units",
        "distance",
        "prediction",
      ].every((t) => templates.has(t));
      return {
        assessmentId: group[0].assessmentId!,
        at: group
          .map((a) => a.submittedAt)
          .sort()
          .at(-1)!,
        pass:
          valid &&
          score >= 4 &&
          critical &&
          independent &&
          k1Outcomes.every((o) => outcomes.has(o.id)),
        score,
      };
    })
    .sort((a, b) => a.at.localeCompare(b.at));
  const success = checks.filter((c) => c.pass);
  const first = success[0];
  let last = first;
  let delayedReviews = 0;
  for (const check of success.slice(1))
    if (last && Date.parse(check.at) - Date.parse(last.at) >= 86400000) {
      delayedReviews++;
      last = check;
    }
  const days = [1, 3, 7][Math.min(delayedReviews, 2)];
  const nextReviewAt = last
    ? new Date(Date.parse(last.at) + days * 86400000).toISOString()
    : null;
  const failedSince = !!last && checks.some((c) => !c.pass && c.at > last.at);
  return {
    demonstrated: !!first,
    demonstratedAt: first?.at ?? null,
    completed:
      !!first &&
      experiments.some(
        (e) =>
          e.context !== "playground" &&
          e.conclusion.trim() &&
          e.prediction.trim() &&
          e.observations.trim(),
      ),
    nextReviewAt,
    reviewNeeded: failedSince || (!!nextReviewAt && now >= nextReviewAt),
    checks,
  };
}
