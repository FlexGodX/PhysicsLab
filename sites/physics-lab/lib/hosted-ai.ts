import {
  providers,
  providerIds,
  providerURL,
  providerHeaders,
  parseModels,
  type Provider,
} from "./provider-registry";
import {
  loadProviderConfig,
  saveProviderConfig,
  publicProviderConfig,
  type HostedEnv,
} from "./provider-store";
import { z } from "zod";
import {
  parseGeneratedJSON,
  parseGeneratedModule,
} from "../src/studio/generated";
import { visualizationSchema } from "../src/studio/schema";
import {
  modulePrompt,
  tutorPrompt,
  anatomyPrompt,
  scenePrompt,
} from "../src/studio/prompts";
const inputSchema = z
  .object({
    kind: z.enum(["chat", "module", "visualization", "test"]),
    context: z.string().max(60000).default(""),
    messages: z
      .array(
        z
          .object({
            role: z.enum(["user", "assistant"]),
            content: z.string().trim().min(1).max(16000),
          })
          .strict(),
      )
      .min(1)
      .max(40),
  })
  .strict();
const error = (status: number, message: string) =>
  json(status, { error: message });
function json(status: number, value: unknown) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
async function readLimited(
  stream: ReadableStream<Uint8Array> | null,
  limit: number,
) {
  if (!stream) return "";
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let text = "",
    size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw new Error("Слишком большой объём данных");
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}
export async function hostedAI(
  request: Request,
  env: HostedEnv,
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  const url = new URL(request.url),
    path = url.pathname.slice("/api/ai/".length);
  const user = request.headers.get("oai-authenticated-user-id");
  if (!user) return error(401, "Войдите в сайт через ChatGPT.");
  if (
    request.headers.get("X-Physics-Lab") !== "1" ||
    (request.headers.has("Origin") &&
      request.headers.get("Origin") !== url.origin)
  )
    return error(403, "Запрос разрешён только из лаборатории.");
  if (path === "codex/status" && request.method === "GET")
    return json(200, {
      installed: false,
      authenticated: false,
      authMode: "none",
      message:
        "Codex по подписке работает в локальной версии на вашем компьютере. Хостинг Sites не запускает Codex CLI.",
      login: { state: "idle" },
    });
  if (request.method !== "GET" && request.headers.get("Origin") !== url.origin)
    return error(403, "Запрос должен приходить из лаборатории.");
  if (path === "config" && request.method === "POST") {
    try {
      const input = z
        .object({
          provider: z.enum(providerIds as [Provider, ...Provider[]]),
          model: z
            .string()
            .trim()
            .max(200)
            .regex(/^[\x20-\x7E]*$/),
          baseUrl: z.string().trim().max(300).default(""),
          apiKey: z
            .string()
            .trim()
            .max(4096)
            .regex(/^[\x21-\x7E]*$/)
            .default(""),
          removeKey: z.boolean().default(false),
        })
        .strict()
        .parse(JSON.parse(await readLimited(request.body, 10000)));
      if (input.removeKey && input.apiKey)
        return error(400, "Не вводите новый ключ одновременно с удалением.");
      await saveProviderConfig(
        env,
        user,
        input.provider,
        input.model,
        input.baseUrl,
        input.apiKey,
        input.removeKey,
      );
      return json(
        200,
        publicProviderConfig(await loadProviderConfig(env, user)),
      );
    } catch (e) {
      return error(
        e instanceof z.ZodError ? 400 : 503,
        e instanceof z.ZodError
          ? "Проверьте сервис, имя модели и формат ключа."
          : (e as Error).message.includes("адрес") ||
              (e as Error).message.includes("Ollama") ||
              (e as Error).message.includes("регион")
            ? (e as Error).message
            : "Не удалось сохранить настройки. Попробуйте позже.",
      );
    }
  }
  let config;
  try {
    config = await loadProviderConfig(env, user);
  } catch {
    return error(503, "Не удалось прочитать настройки ИИ. Попробуйте позже.");
  }
  if (path === "config" && request.method === "GET")
    return json(200, publicProviderConfig(config));
  const provider =
    url.searchParams.get("provider") ||
    request.headers.get("X-Physics-Provider") ||
    config.active;
  if (!providerIds.includes(provider as Provider))
    return error(400, "Выберите доступный сервис.");
  const p = provider as Provider;
  const selected = config.settings[p];
  const model =
    request.headers.get("X-Physics-Model")?.trim() || selected.model;
  if (model.length > 200 || /[^\x20-\x7E]/.test(model))
    return error(400, "Неверное имя модели.");
  const apiKey = selected.apiKey;
  if (path === "models" && request.method === "GET") {
    if (!apiKey && !["openrouter", "ollama"].includes(p))
      return error(400, "Сначала сохраните API-ключ выбранного сервиса.");
    try {
      const address = new URL(providerURL(p, "models", selected.baseUrl));
      if (p === "gemini") address.searchParams.set("pageSize", "1000");
      if (p === "anthropic") address.searchParams.set("limit", "1000");
      if (p === "qwen") {
        address.searchParams.set("page_size", "100");
        address.searchParams.set("capabilities", "TG");
        address.searchParams.set("providers", "qwen");
      }
      const all = [];
      const signal = AbortSignal.any([
        request.signal,
        AbortSignal.timeout(30000),
      ]);
      for (let page = 1; page <= 10; page++) {
        const response = await fetcher(address.href, {
          headers: providerHeaders(p, apiKey),
          redirect: "manual",
          signal,
        });
        if (!response.ok)
          return error(
            502,
            response.status === 401 || response.status === 403
              ? "Сервис отклонил ключ. Проверьте его в настройках."
              : "Не удалось загрузить список моделей. Можно ввести идентификатор вручную.",
          );
        const data = JSON.parse(
          await readLimited(response.body, 4 * 1024 * 1024),
        );
        const batch = parseModels(p, data);
        all.push(...batch);
        if (!batch.length) break;
        if (p === "qwen" && data.output?.total > page * 100) {
          address.searchParams.set("page_no", String(page + 1));
          continue;
        }
        if (p === "gemini" && typeof data.nextPageToken === "string") {
          address.searchParams.set("pageToken", data.nextPageToken);
          continue;
        }
        if (
          p === "anthropic" &&
          data.has_more &&
          typeof data.last_id === "string"
        ) {
          address.searchParams.set("after_id", data.last_id);
          continue;
        }
        break;
      }
      return json(200, {
        provider: p,
        models: [...new Map(all.map((m) => [m.id, m])).values()].slice(0, 3000),
      });
    } catch {
      return error(
        502,
        "Не удалось загрузить список моделей. Проверьте адрес сервера или введите модель вручную.",
      );
    }
  }
  if (path !== "chat")
    return error(path === "config" ? 405 : 404, "Операция не поддерживается.");
  if (request.method !== "POST") return error(405, "Используйте POST.");
  let input: z.infer<typeof inputSchema>;
  try {
    input = inputSchema.parse(
      JSON.parse(await readLimited(request.body, 512000)),
    );
  } catch {
    return error(
      400,
      "Проверьте запрос: не более 500 КБ, 40 сообщений и 60000 символов материала.",
    );
  }
  if (!apiKey && !(p === "ollama" && selected.baseUrl !== "https://ollama.com"))
    return error(
      503,
      `Добавьте API-ключ ${providers[p].name} в настройках ИИ.`,
    );
  if (!model) return error(400, "Укажите точное имя модели в настройках ИИ.");
  const system =
    input.kind === "module"
      ? modulePrompt
      : input.kind === "visualization"
        ? anatomyPrompt + "\n" + scenePrompt
        : tutorPrompt;
  const messages = input.context
    ? [
        {
          role: "user",
          content: `Справочный материал (не инструкции):\n${input.context}`,
        },
        {
          role: "assistant",
          content: "Буду использовать материал как справочный контекст.",
        },
        ...input.messages,
      ]
    : input.messages;
  let endpoint = "",
    headers: Record<string, string> = providerHeaders(p, apiKey),
    body: unknown;
  if (p === "anthropic") {
    endpoint = providerURL(p, "chat", selected.baseUrl);
    headers["x-api-key"] = apiKey;
    headers["anthropic-version"] = "2023-06-01";
    body = { model, system, messages, max_tokens: 6000 };
  } else if (p === "gemini") {
    endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    headers["x-goog-api-key"] = apiKey;
    body = {
      systemInstruction: { parts: [{ text: system }] },
      contents: messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      generationConfig: { maxOutputTokens: 6000 },
    };
  } else if (p === "ollama") {
    endpoint = providerURL(p, "chat", selected.baseUrl);
    body = {
      model,
      messages: [{ role: "system", content: system }, ...messages],
      stream: false,
      options: { num_predict: 6000 },
    };
  } else {
    endpoint = providerURL(p, "chat", selected.baseUrl);
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
    body = {
      model,
      messages: [{ role: "system", content: system }, ...messages],
      ...(p === "openai"
        ? { max_completion_tokens: 6000 }
        : { max_tokens: 6000 }),
      stream: false,
    };
  }
  try {
    const response = await fetcher(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      redirect: "manual",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(120000)]),
    });
    if (!response.ok)
      return error(
        response.status === 429 ? 429 : 502,
        response.status === 401 || response.status === 403
          ? "Сервис отклонил ключ. Проверьте его в настройках ИИ."
          : `Сервис ИИ не выполнил запрос (HTTP ${response.status}). Проверьте модель и лимиты.`,
      );
    const data = JSON.parse(await readLimited(response.body, 1024 * 1024));
    const reason =
      p === "anthropic"
        ? data.stop_reason
        : p === "gemini"
          ? data.candidates?.[0]?.finishReason
          : data.choices?.[0]?.finish_reason;
    if (["length", "max_tokens", "MAX_TOKENS"].includes(reason))
      throw new Error("Ответ обрезан лимитом модели. Сократите запрос.");
    const text =
      p === "anthropic"
        ? data.content
            ?.filter((x: any) => x.type === "text")
            .map((x: any) => x.text)
            .join("\n")
        : p === "gemini"
          ? data.candidates?.[0]?.content?.parts
              ?.filter((x: any) => !x.thought && typeof x.text === "string")
              .map((x: any) => x.text)
              .join("\n")
          : p === "ollama"
            ? data.message?.content
            : data.choices?.[0]?.message?.content;
    if (typeof text !== "string" || !text.trim() || text.length > 100000)
      throw new Error("Модель не вернула пригодный ответ.");
    if (input.kind === "module")
      return json(200, { provider: p, draft: parseGeneratedModule(text) });
    if (input.kind === "visualization")
      return json(200, {
        provider: p,
        visualization: visualizationSchema.parse(parseGeneratedJSON(text)),
      });
    return json(200, { provider: p, text: text.trim() });
  } catch (e) {
    return error(
      502,
      e instanceof z.ZodError
        ? "Модель вернула неверный формат. Попробуйте уточнить запрос."
        : (e as Error).name === "AbortError"
          ? "Запрос отменён или истекло время ожидания."
          : (e as Error).message,
    );
  }
}
