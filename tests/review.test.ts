import { it, expect } from "vitest";
import { emptyWorkspace, validateImport } from "../src/persistence/schema";
import { reviewQueue, achievements, allProgress } from "../src/learning/review";
import {
  diagnosticResult,
  diagnosticQuestions,
} from "../src/content/diagnostics";
import { makeAttempt } from "../src/learning/assessment";
import { assessmentTasks, k1Tasks } from "../src/content/k1";
import { unitAssessmentTasks } from "../src/content/modules";
const day = "2026-10-15T12:00:00.000Z";
function batch(time: string, id: string) {
  return assessmentTasks(0).map((t) =>
    makeAttempt(t, String(t.answer), t.unit ?? "", 0, id, time),
  );
}
it("пропуск не равен незнанию, диагностика не даёт подтверждения", () => {
  expect(diagnosticResult(diagnosticQuestions[0], null, "skip")).toBe(
    "no-data",
  );
  expect(diagnosticResult(diagnosticQuestions[0], null, "unknown")).toBe("gap");
  const d = emptyWorkspace();
  expect(allProgress(d).every((p) => !p.demonstrated)).toBe(true);
});
it("очередь отдаёт сначала просрочку, потом ошибки и новые темы; не больше трёх", () => {
  const d = emptyWorkspace();
  d.attempts = batch(day, "first");
  const t = unitAssessmentTasks("E1", 0)[0];
  d.attempts.push(makeAttempt(t, "ошибка", "", 0, null, day));
  expect(
    reviewQueue(d, "2026-10-17T12:00:00.000Z").map((r) => r.reason),
  ).toEqual(["overdue", "error", "new"]);
  expect(reviewQueue(d, "2026-10-17T12:00:00.000Z")[0].unitId).toBe("K1");
});
it("успех другого модуля не становится неудачным повторением K1", () => {
  const d = emptyWorkspace();
  d.attempts = batch(day, "k1");
  d.attempts.push(
    ...unitAssessmentTasks("T1", 0).map((t) =>
      makeAttempt(
        t,
        String(t.answer),
        t.unit ?? "",
        0,
        "t1",
        "2026-10-15T13:00:00.000Z",
      ),
    ),
  );
  expect(allProgress(d, "2026-10-15T14:00:00.000Z")[0].reviewNeeded).toBe(
    false,
  );
});
it("повторение назначается через 1, 3 и 7 дней и не стирает первое подтверждение", () => {
  const d = emptyWorkspace();
  d.attempts = batch(day, "one");
  expect(allProgress(d)[0].nextReviewAt).toBe("2026-10-16T12:00:00.000Z");
  d.attempts.push(...batch("2026-10-16T12:00:00.000Z", "two"));
  expect(allProgress(d)[0].nextReviewAt).toBe("2026-10-19T12:00:00.000Z");
  d.attempts.push(...batch("2026-10-19T12:00:00.000Z", "three"));
  expect(allProgress(d)[0].nextReviewAt).toBe("2026-10-26T12:00:00.000Z");
  expect(allProgress(d, "2026-11-01T12:00:00.000Z")[0].demonstrated).toBe(true);
});
it("награды требуют доказательств и исправления на другом варианте", () => {
  const d = emptyWorkspace();
  d.materialOpenedAt = day;
  d.selfMarkedAt = day;
  expect(achievements(d)).toEqual([]);
  const a = k1Tasks.find((t) => t.id === "speed-a")!,
    b = k1Tasks.find((t) => t.id === "speed-b")!;
  d.attempts.push(
    makeAttempt(a, "не знаю", "м/с", 0, null, day),
    makeAttempt(a, String(a.answer), "м/с", 0, null, day),
  );
  expect(achievements(d).map((a) => a.id)).toEqual(["independent"]);
  d.attempts.push(
    makeAttempt(
      b,
      String(b.answer),
      "м/с",
      0,
      null,
      "2026-10-16T12:00:00.000Z",
    ),
  );
  expect(achievements(d).some((a) => a.id === "recovery")).toBe(true);
  d.attempts.push(
    ...batch(day, "one"),
    ...batch("2026-10-16T12:00:00.000Z", "two"),
  );
  expect(achievements(d).filter((a) => a.id === "review")).toHaveLength(1);
  expect(validateImport(JSON.stringify(d)).attempts).toHaveLength(
    d.attempts.length,
  );
});
it("награда за повторение ссылается на обе полные проверки с разным временем ответов", () => {
  const d = emptyWorkspace();
  d.attempts = [
    ...batch(day, "one"),
    ...batch("2026-10-16T12:00:00.000Z", "two"),
  ].map((a, i) => ({
    ...a,
    submittedAt: new Date(
      Date.parse(a.submittedAt) + (i % 5) * 1000,
    ).toISOString(),
  }));
  expect(
    achievements(d).find((a) => a.id === "review")!.evidenceIds,
  ).toHaveLength(10);
});
