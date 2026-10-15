import { sceneSchema } from "../figures/scene.ts";
import { z } from "zod";
const text = z.string().trim().min(1).max(8000);
const id = z.string().min(1).max(100);
export const visualizationSchema = z
  .object({
    id: id.optional(),
    title: z.string().trim().min(1).max(160),
    mechanism: z.enum(["spring", "lever", "custom"]),
    scene: sceneSchema.optional(),
    caption: text,
    sourcePrompt: z.string().max(4000).optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.mechanism === "custom" && !v.scene)
      ctx.addIssue({ code: "custom", message: "Отсутствует устройство сцены" });
  });
const questionShape = {
  prompt: text,
  options: z.array(z.string().trim().min(1).max(1000)).min(2).max(6),
  correctIndex: z.number().int().min(0),
  explanation: text,
};
const validQuestion = (q: { options: string[]; correctIndex: number }) =>
  q.correctIndex < q.options.length &&
  new Set(q.options).size === q.options.length;
const question = z
  .object(questionShape)
  .strict()
  .refine(
    (q) =>
      q.correctIndex < q.options.length &&
      new Set(q.options).size === q.options.length,
    "Неверные варианты ответа",
  );
export const moduleDraftSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    objective: text,
    sections: z
      .array(
        z
          .object({ title: z.string().trim().min(1).max(160), body: text })
          .strict(),
      )
      .min(1)
      .max(20),
    example: z.string().max(8000),
    questions: z.array(question).max(10),
    visualizations: z.array(visualizationSchema).max(6),
  })
  .strict();
export type ModuleDraft = z.infer<typeof moduleDraftSchema>;
export const customModuleSchema = moduleDraftSchema
  .extend({
    id: id.regex(/^custom-/),
    version: z.literal(1),
    createdAt: z.iso.datetime(),
    source: z
      .object({
        kind: z.enum(["document", "prompt"]),
        name: z.string().max(200),
        text: z.string().max(60000),
        provider: z.string().max(80),
      })
      .strict(),
    sections: z
      .array(
        z
          .object({ id, title: z.string().min(1).max(160), body: text })
          .strict(),
      )
      .min(1)
      .max(20),
    questions: z
      .array(
        z
          .object({ ...questionShape, id })
          .strict()
          .refine(validQuestion, "Неверные варианты ответа"),
      )
      .max(10),
  })
  .superRefine((m, ctx) => {
    for (const items of [m.sections, m.questions])
      if (new Set(items.map((x) => x.id)).size !== items.length)
        ctx.addIssue({ code: "custom", message: "Повторный ID" });
  });
// Keep question objects strict while adding their persisted identifier.
export type CustomModule = Omit<
  z.infer<typeof customModuleSchema>,
  "questions"
> & { questions: (z.infer<typeof question> & { id: string })[] };
export const customRunSchema = z
  .object({
    id,
    moduleId: id,
    answers: z.array(z.number().int().min(0).max(5)).max(10),
    createdAt: z.iso.datetime(),
  })
  .strict();
export type CustomRun = z.infer<typeof customRunSchema>;
export const chatSchema = z
  .object({
    id,
    topicId: id,
    messages: z
      .array(
        z
          .object({
            role: z.enum(["user", "assistant"]),
            content: z.string().min(1).max(16000),
          })
          .strict(),
      )
      .max(200),
    updatedAt: z.iso.datetime(),
  })
  .strict();
export type StudyChat = z.infer<typeof chatSchema>;
