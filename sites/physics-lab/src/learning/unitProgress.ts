import type { Attempt, ModelExperiment } from "../content/types";
import {
  learningUnits,
  unitAssessmentTasks,
  type ExtraUnitId,
} from "../content/modules";
import { findTask } from "../content/registry";
import { gradeAnswer } from "./assessment";
export function deriveUnitProgress(
  id: ExtraUnitId,
  attempts: Attempt[],
  experiments: ModelExperiment[],
  now = new Date().toISOString(),
) {
  const unit = learningUnits[id],
    expected = new Set(unitAssessmentTasks(id, 0).map((t) => t.templateId));
  const groups = new Map<string, Attempt[]>();
  for (const a of attempts)
    if (a.assessmentId && unit.tasks.some((t) => t.id === a.taskId))
      groups.set(a.assessmentId, [...(groups.get(a.assessmentId) ?? []), a]);
  const checks = [...groups.values()]
    .filter((g) => g.length === 5)
    .map((g) => {
      const templates = new Set<string>(),
        outcomes = new Set<string>();
      let score = 0,
        critical = true,
        independent = true;
      for (const a of g) {
        const task = findTask(a.taskId, a.taskVersion);
        if (!task) {
          critical = false;
          continue;
        }
        templates.add(task.templateId);
        const correct = gradeAnswer(task, a.answer, a.unit).correct;
        if (correct) {
          score++;
          task.outcomeIds.forEach((o) => outcomes.add(o));
        }
        if (task.critical && !correct) critical = false;
        if (a.hintsUsed > 0) independent = false;
      }
      return {
        assessmentId: g[0].assessmentId!,
        at: g
          .map((a) => a.submittedAt)
          .sort()
          .at(-1)!,
        score,
        pass:
          templates.size === 5 &&
          [...expected].every((t) => templates.has(t)) &&
          score >= 4 &&
          critical &&
          independent &&
          unit.outcomes.every((o) => outcomes.has(o.id)),
      };
    })
    .sort((a, b) => a.at.localeCompare(b.at));
  const successes = checks.filter((c) => c.pass),
    first = successes[0];
  let last = first,
    delayed = 0;
  for (const s of successes.slice(1))
    if (last && Date.parse(s.at) - Date.parse(last.at) >= 86400000) {
      last = s;
      delayed++;
    }
  const nextReviewAt = last
    ? new Date(
        Date.parse(last.at) + [1, 3, 7][Math.min(delayed, 2)] * 86400000,
      ).toISOString()
    : null;
  return {
    demonstrated: !!first,
    demonstratedAt: first?.at ?? null,
    completed:
      !!first &&
      experiments.some(
        (e) =>
          e.context === "lesson" &&
          e.modelId === unit.modelId &&
          e.conclusion.trim() &&
          e.prediction.trim() &&
          e.observations.trim(),
      ),
    nextReviewAt,
    reviewNeeded:
      !!nextReviewAt &&
      (now >= nextReviewAt || checks.some((c) => !c.pass && c.at > last!.at)),
    checks,
  };
}
