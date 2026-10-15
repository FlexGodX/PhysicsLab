import { it, expect } from "vitest";
import {
  parseGeneratedModule,
  parseGeneratedJSON,
} from "../src/studio/generated";
it("берёт один JSON из ответа и вычисляет индекс по правильному тексту ответа", () => {
  const q = {
    prompt: "Сила при k=100 Н/м и x=0,02 м?",
    options: ["1 Н", "2 Н", "4 Н"],
    answer: "2 Н",
    explanation: "100 × 0,02 = 2 Н",
  };
  const draft = {
    title: "Закон Гука",
    objective: "Понять силу",
    sections: [{ title: "Закон", body: "F = kx" }],
    example: "2 Н",
    questions: [q, q, q],
    visualizations: [],
  };
  const d = parseGeneratedModule(
    "```json\n" + JSON.stringify(draft) + "\n```\nДополнение",
  );
  expect(d.questions[0].correctIndex).toBe(1);
  expect(() =>
    parseGeneratedModule(
      JSON.stringify({ ...draft, questions: [{ ...q, answer: "3 Н" }, q, q] }),
    ),
  ).toThrow();
  expect(
    parseGeneratedJSON(
      'Перед JSON\n{"caption":"Скобка } внутри строки"}\nПосле',
    ),
  ).toEqual({ caption: "Скобка } внутри строки" });
});
