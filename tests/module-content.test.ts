import { it, expect } from "vitest";
import { learningUnits, unitAssessmentTasks } from "../src/content/modules";
import { makeAttempt } from "../src/learning/assessment";
import { deriveUnitProgress } from "../src/learning/unitProgress";
it("каждый новый модуль имеет полноценный банк, покрытие и меняет варианты", () => {
  for (const unit of Object.values(learningUnits)) {
    expect(unit.outcomes.length).toBeGreaterThanOrEqual(3);
    expect(unit.tasks.length).toBeGreaterThanOrEqual(12);
    expect(
      new Set(
        unit.tasks.filter((t) => t.kind === "concept").map((t) => t.templateId),
      ).size,
    ).toBeGreaterThanOrEqual(3);
    const first = unitAssessmentTasks(unit.id, 0);
    expect(first.length).toBe(5);
    expect(
      first.every(
        (t) => !unitAssessmentTasks(unit.id, 1).some((v) => v.id === t.id),
      ),
    ).toBe(true);
    const attempts = first.map((t) =>
      makeAttempt(
        t,
        String(t.answer),
        t.unit ?? "",
        0,
        "exam-1",
        "2026-10-15T12:00:00.000Z",
      ),
    );
    expect(
      deriveUnitProgress(unit.id, attempts, []).demonstrated,
      unit.id,
    ).toBe(true);
    const critical = first.find((t) => t.critical)!;
    const wrong = attempts.map((a) =>
      a.taskId === critical.id ? { ...a, answer: "wrong" } : a,
    );
    expect(deriveUnitProgress(unit.id, wrong, []).demonstrated, unit.id).toBe(
      false,
    );
  }
});
