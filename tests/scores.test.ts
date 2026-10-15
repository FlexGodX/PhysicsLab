import { describe, it, expect } from "vitest";
import { moduleScore } from "../src/learning/scores";
import { emptyWorkspace } from "../src/persistence/schema";
import { assessmentTasks } from "../src/content/k1";
import { makeAttempt } from "../src/learning/assessment";
describe("баллы модуля", () => {
  it("не считает неполную проверку и не суммирует повторные попытки", () => {
    const d = emptyWorkspace();
    const tasks = assessmentTasks(0);
    d.attempts = tasks
      .slice(0, 4)
      .map((t) => makeAttempt(t, String(t.answer), t.unit ?? "", 0, "one"));
    expect(moduleScore(d, "K1").points).toBeNull();
    d.attempts.push(makeAttempt(tasks[4], "ошибка", "", 0, "one"));
    expect(moduleScore(d, "K1")).toMatchObject({
      points: 80,
      accuracy: 80,
      completion: 33,
    });
    d.attempts.push(
      ...tasks.map((t) =>
        makeAttempt(t, String(t.answer), t.unit ?? "", 0, "two"),
      ),
    );
    expect(moduleScore(d, "K1").points).toBe(100);
  });
  it("открытие материала не даёт баллов за знания", () => {
    const d = emptyWorkspace();
    d.materialOpenedAt = new Date().toISOString();
    expect(moduleScore(d, "K1")).toMatchObject({
      points: null,
      completion: 33,
    });
  });
});
