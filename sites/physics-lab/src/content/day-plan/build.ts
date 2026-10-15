import type { CustomModule } from "../../studio/schema";
import type { LmsQuestion } from "../lms/build";
export const daySourceName = "Физика_план_на_16_октября.pdf";
export interface DayDefinition {
  key: string;
  title: string;
  objective: string;
  minutes: number;
  pages: number[];
  time: string;
  relatedTopics: string[];
  sections: [string, string][];
  example: string;
  questions: LmsQuestion[];
}
export function buildDayEntries(definitions: DayDefinition[]) {
  return definitions.map((d) => {
    const id = `custom-day-${d.key}`;
    const module: CustomModule = {
      id,
      version: 1,
      title: d.title,
      objective: d.objective,
      createdAt: "2026-10-16T00:00:00.000Z",
      sections: d.sections.map(([title, body], i) => ({
        id: `${id}-section-${i + 1}`,
        title,
        body,
      })),
      example: d.example,
      questions: d.questions.map(
        ([prompt, correct, alternatives, explanation], i) => {
          const choices = [correct, ...alternatives],
            shift = (i + d.key.length) % choices.length;
          const options = [...choices.slice(shift), ...choices.slice(0, shift)];
          return {
            id: `${id}-question-${i + 1}`,
            prompt,
            options,
            correctIndex: options.indexOf(correct),
            explanation,
          };
        },
      ),
      visualizations: [],
      source: {
        kind: "document",
        name: daySourceName,
        provider: "",
        text: `Учебный маршрут по плану от 16 октября 2026. Страницы PDF: ${d.pages.join(", ")}. Краткие объяснения, примеры и самостоятельная тренировка. Проверки с вариантами ответов — адаптация для приложения; они не заменяют объяснение вслух и не являются экзаменационными билетами. Самооценка исходной пробной пересдачи: 0–2 за каждый из 12 ответов, максимум 24; автоматические баллы модуля 0–100 считаются отдельно.`,
      },
    };
    return {
      module,
      minutes: d.minutes,
      pages: d.pages,
      time: d.time,
      relatedTopics: d.relatedTopics.map((key) => `custom-lms-${key}`),
    };
  });
}
