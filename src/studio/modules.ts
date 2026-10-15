import {
  customModuleSchema,
  type CustomModule,
  type CustomRun,
  type ModuleDraft,
} from "./schema";
export function materializeModule(
  draft: ModuleDraft,
  source: CustomModule["source"],
): CustomModule {
  return customModuleSchema.parse({
    ...draft,
    id: `custom-${crypto.randomUUID()}`,
    version: 1,
    createdAt: new Date().toISOString(),
    source,
    sections: draft.sections.map((s) => ({ ...s, id: crypto.randomUUID() })),
    questions: draft.questions.map((q) => ({ ...q, id: crypto.randomUUID() })),
  });
}
export function createReadingModule(title: string, text: string, name: string) {
  const body = text.trim();
  if (!body) throw new Error("В документе нет текста");
  if (body.length > 60000) throw new Error("Не более 60000 символов");
  const chunks = Array.from({ length: Math.ceil(body.length / 6000) }, (_, i) =>
    body.slice(i * 6000, (i + 1) * 6000),
  );
  return materializeModule(
    {
      title,
      objective: "Изучить материал документа и отметить прочитанные разделы.",
      sections: chunks.map((body, i) => ({ title: `Часть ${i + 1}`, body })),
      example: "",
      questions: [],
      visualizations: [],
    },
    { kind: "document", name, text: body, provider: "" },
  );
}
export function customScore(
  m: CustomModule,
  runs: CustomRun[],
  read: string[],
) {
  const complete = runs
    .filter(
      (r) =>
        r.moduleId === m.id &&
        r.answers.length === m.questions.length &&
        m.questions.length > 0,
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const last = complete.at(-1);
  const points = last
    ? Math.round(
        (100 *
          last.answers.filter((a, i) => a === m.questions[i].correctIndex)
            .length) /
          m.questions.length,
      )
    : null;
  const passed = complete.some(
    (r) =>
      r.answers.filter((a, i) => a === m.questions[i].correctIndex).length /
        m.questions.length >=
      0.8,
  );
  const done =
    m.sections.filter((s) => read.includes(s.id)).length +
    (m.questions.length && passed ? 1 : 0);
  return {
    points,
    passed,
    completion: Math.round(
      (100 * done) / (m.sections.length + (m.questions.length ? 1 : 0)),
    ),
  };
}
