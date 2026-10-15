import type { CustomModule } from "../../studio/schema";
import type { LmsGroupId } from "./inventory";
import { lmsSources } from "./inventory";
export type LmsQuestion = [
  prompt: string,
  correct: string,
  alternatives: string[],
  explanation: string,
];
export interface LmsDefinition {
  key: string;
  title: string;
  objective: string;
  sources: number[];
  relatedUnit?: "K1" | "K2" | "M1" | "T1" | "R1" | "E1";
  sections: [string, string][];
  example: string;
  questions: LmsQuestion[];
}
export function buildEntries(
  groupId: LmsGroupId,
  definitions: LmsDefinition[],
) {
  return definitions.map((d) => {
    const id = `custom-lms-${d.key}`;
    const sources = d.sources.map((sourceId) => {
      const source = lmsSources.find((s) => s.id === String(sourceId));
      if (!source) throw new Error(`Неизвестный источник ${sourceId}`);
      return source;
    });
    const module: CustomModule = {
      id,
      version: 1,
      title: d.title,
      objective: d.objective,
      createdAt: "2026-10-15T21:00:00.000Z",
      sections: d.sections.map(([title, body], i) => ({
        id: `${id}-section-${i + 1}`,
        title,
        body,
      })),
      example: d.example,
      questions: d.questions.map(
        ([prompt, correct, alternatives, explanation], i) => {
          const original = [correct, ...alternatives];
          const shift = (i + d.key.length) % original.length;
          const options = [
            ...original.slice(shift),
            ...original.slice(0, shift),
          ];
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
        name: "Материалы по физике для задолжников 2026 · LMS ЮФУ",
        provider: "",
        text:
          "Учебная адаптация: самостоятельные объяснения и задания приложения по темам курса. Это не копия оцениваемых заданий LMS.\n" +
          sources
            .map((s) => `${s.title}\n${s.url}\n${s.verified}`)
            .join("\n\n"),
      },
    };
    return {
      groupId,
      module,
      sourceIds: sources.map((s) => s.id),
      relatedUnit: d.relatedUnit,
    };
  });
}
