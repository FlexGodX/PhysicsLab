import { z } from "zod";
import { codexClient } from "./codex.ts";
export const providerIds = [
  "lmstudio",
  "openrouter",
  "openai",
  "anthropic",
  "gemini",
  "codex",
] as const;
export type ProviderId = (typeof providerIds)[number];
export const providerSchema = z
  .object({
    provider: z.enum(providerIds),
    fastMode: z.boolean().optional(),
    model: z.string().trim().max(200),
    apiKey: z.string().max(500).default(""),
    baseUrl: z.string().max(300).default("http://127.0.0.1:1234/v1"),
  })
  .strict();
export type ProviderConfig = z.infer<typeof providerSchema>;
export type Message = { role: "user" | "assistant"; content: string };
export function validateProvider(value: unknown): ProviderConfig {
  const c = providerSchema.parse(value);
  if (c.provider === "codex")
    return { ...c, apiKey: "", baseUrl: "", fastMode: false };
  if (!c.model) throw new Error("Укажите имя модели выбранного сервиса.");
  if (c.provider === "lmstudio") {
    const u = new URL(c.baseUrl);
    if (
      !["http:", "https:"].includes(u.protocol) ||
      !["localhost", "127.0.0.1", "[::1]"].includes(u.hostname) ||
      u.username ||
      u.password ||
      u.search ||
      u.hash ||
      u.pathname.replace(/\/$/, "") !== "/v1"
    )
      throw new Error(
        "LM Studio: используйте локальный адрес вида http://127.0.0.1:1234/v1",
      );
  }
  return c;
}
export function providerRequest(
  c: ProviderConfig,
  system: string,
  messages: Message[],
) {
  c = validateProvider(c);
  if (c.provider === "codex")
    throw new Error("Codex использует локальный агент, а не HTTP API.");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (c.provider === "anthropic")
    return {
      url: "https://api.anthropic.com/v1/messages",
      headers: {
        ...headers,
        "x-api-key": c.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: { model: c.model, system, messages, max_tokens: 6000 },
    };
  if (c.provider === "gemini")
    return {
      url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(c.model)}:generateContent`,
      headers: { ...headers, "x-goog-api-key": c.apiKey },
      body: {
        systemInstruction: { parts: [{ text: system }] },
        contents: messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        generationConfig: { maxOutputTokens: 6000 },
      },
    };
  if (c.apiKey) headers.Authorization = `Bearer ${c.apiKey}`;
  if (c.provider === "lmstudio" && c.fastMode)
    return {
      url: new URL("/api/v1/chat", c.baseUrl).href,
      headers,
      body: {
        model: c.model,
        system_prompt: system,
        input:
          messages.length === 1
            ? messages[0].content
            : messages
                .map(
                  (m) =>
                    (m.role === "user" ? "Ученик: " : "Помощник: ") + m.content,
                )
                .join("\n\n"),
        reasoning: "off",
        temperature: 0.3,
        store: false,
        max_output_tokens: 6000,
      },
    };
  const base =
    c.provider === "openai"
      ? "https://api.openai.com/v1"
      : c.provider === "openrouter"
        ? "https://openrouter.ai/api/v1"
        : c.baseUrl.replace(/\/$/, "");
  return {
    url: `${base}/chat/completions`,
    headers,
    body: {
      model: c.model,
      messages: [{ role: "system", content: system }, ...messages],
      ...(c.provider === "openai"
        ? { max_completion_tokens: 6000 }
        : { max_tokens: 6000 }),
      stream: false,
    },
  };
}
export function providerText(provider: ProviderId, value: unknown): string {
  const d = value as any;
  const reason =
    provider === "anthropic"
      ? d?.stop_reason
      : provider === "gemini"
        ? d?.candidates?.[0]?.finishReason
        : d?.choices?.[0]?.finish_reason;
  if (["length", "max_tokens", "MAX_TOKENS"].includes(reason))
    throw new Error(
      "Ответ обрезан лимитом модели. Сократите запрос и повторите.",
    );
  const result =
    provider === "lmstudio" && Array.isArray(d?.output)
      ? d.output
          .filter((x: any) => x.type === "message")
          .map((x: any) => x.content)
          .join("\n")
      : provider === "anthropic"
        ? d?.content
            ?.filter((x: any) => x.type === "text")
            .map((x: any) => x.text)
            .join("\n")
        : provider === "gemini"
          ? d?.candidates?.[0]?.content?.parts
              ?.filter((x: any) => !x.thought && typeof x.text === "string")
              .map((x: any) => x.text)
              .join("\n")
          : d?.choices?.[0]?.message?.content;
  if (typeof result !== "string" || !result.trim() || result.length > 100000)
    throw new Error(
      "Модель не вернула пригодный текст. Попробуйте другую модель.",
    );
  return result.trim();
}
export async function askProvider(
  config: ProviderConfig,
  system: string,
  messages: Message[],
  signal?: AbortSignal,
  timeoutMs = 120000,
  agent = codexClient,
) {
  config = validateProvider(config);
  if (config.provider === "codex")
    return agent.ask(config.model, system, messages, signal, timeoutMs);
  if (config.provider !== "lmstudio" && !config.apiKey)
    throw new Error("Добавьте ключ выбранного сервиса в настройках ИИ.");
  const p = providerRequest(config, system, messages);
  const res = await fetch(p.url, {
    method: "POST",
    headers: p.headers,
    body: JSON.stringify(p.body),
    redirect: "error",
    signal: AbortSignal.any([
      AbortSignal.timeout(timeoutMs),
      ...(signal ? [signal] : []),
    ]),
  });
  if (!res.ok)
    throw new Error(
      res.status === 401 || res.status === 403
        ? "Сервис отклонил ключ. Проверьте настройки."
        : res.status === 429
          ? "Лимит сервиса исчерпан. Попробуйте позже."
          : `Сервис не выполнил запрос (HTTP ${res.status}). Проверьте модель и доступность сервера.`,
    );
  const reader = res.body!.getReader();
  let raw = "",
    size = 0;
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 1024 * 1024) {
      await reader.cancel();
      throw new Error("Ответ сервиса слишком большой");
    }
    raw += decoder.decode(value, { stream: true });
  }
  return providerText(config.provider, JSON.parse(raw + decoder.decode()));
}
