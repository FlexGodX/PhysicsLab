import { it, expect } from "vitest";
import { k1Tasks, assessmentTasks } from "../src/content/k1";
import { gradeAnswer, makeAttempt } from "../src/learning/assessment";
import { deriveProgress } from "../src/learning/progress";
const now = "2026-10-15T12:00:00.000Z";
it("оценивает значение независимо от единицы и поддерживает перевод", () => {
  const task = k1Tasks.find((t) => t.id === "speed-a")!;
  expect(gradeAnswer(task, "4", "м/с")).toMatchObject({ correct: true });
  expect(gradeAnswer(task, "4", "м/с²")).toMatchObject({
    valueCorrect: true,
    unitCorrect: false,
    correct: false,
  });
  expect(gradeAnswer(task, "14,4", "км/ч")).toMatchObject({ correct: true });
  expect(gradeAnswer(task, "", "м/с").correct).toBe(false);
});
function batch(wrong?: string, hints = 0) {
  return assessmentTasks(0).map((t) =>
    makeAttempt(
      t,
      wrong === t.templateId ? "wrong" : String(t.answer),
      t.unit ?? "",
      hints,
      "assessment-1",
      now,
    ),
  );
}
it("требует критические ответы даже при 4 из 5", () => {
  expect(deriveProgress(batch("units"), [], now).demonstrated).toBe(false);
  expect(deriveProgress(batch("distance"), [], now).demonstrated).toBe(false);
  expect(deriveProgress(batch(), [], now).demonstrated).toBe(true);
  expect(deriveProgress(batch(undefined, 1), [], now).demonstrated).toBe(false);
});
it("не смешивает попытки разных проверок и не зачитывает повтор одного вопроса", () => {
  const good = batch();
  expect(
    deriveProgress(
      good.map((a, i) => ({ ...a, assessmentId: String(i) })),
      [],
      now,
    ).demonstrated,
  ).toBe(false);
  expect(
    deriveProgress(
      Array.from({ length: 5 }, () => good[0]),
      [],
      now,
    ).demonstrated,
  ).toBe(false);
});
it("оставляет достижение и назначает повторение через сутки", () => {
  const p = deriveProgress(batch(), [], now);
  expect(p.nextReviewAt).toBe("2026-10-16T12:00:00.000Z");
  expect(p.completed).toBe(false);
  expect(deriveProgress(batch(), [], "2026-10-17T12:00:00.000Z")).toMatchObject(
    { demonstrated: true, reviewNeeded: true },
  );
});
it("меняет варианты повторной проверки и имеет шесть разных шаблонов", () => {
  expect(new Set(k1Tasks.map((t) => t.templateId)).size).toBeGreaterThanOrEqual(
    6,
  );
  expect(k1Tasks.length).toBeGreaterThanOrEqual(12);
  expect(
    assessmentTasks(0).every(
      (t) => !assessmentTasks(1).some((u) => u.id === t.id),
    ),
  ).toBe(true);
});
it("содержит три концептуальных шаблона, каждый с двумя вариантами", () => {
  const concepts = k1Tasks.filter((t) => t.kind === "concept");
  const templates = [...new Set(concepts.map((t) => t.templateId))];
  expect(templates.length).toBeGreaterThanOrEqual(3);
  for (const template of templates)
    expect(
      concepts.filter((t) => t.templateId === template).length,
    ).toBeGreaterThanOrEqual(2);
});
it('целочисленный точный ответ не принимает близкое ошибочное число',()=>{const task=k1Tasks.find(t=>t.id==='speed-a')!;expect(gradeAnswer(task,'4,03','м/с').correct).toBe(false);expect(gradeAnswer(task,'14,4','км/ч').correct).toBe(true);});
