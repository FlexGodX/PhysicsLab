export const providerNames = {
  lmstudio: "LM Studio",
  openrouter: "OpenRouter",
  openai: "OpenAI",
  anthropic: "Anthropic",
  gemini: "Gemini",
  codex: "Codex",
  deepseek: "DeepSeek",
  qwen: "Qwen / Alibaba Cloud",
  nvidia: "NVIDIA NIM",
  ollama: "Ollama",
};
export interface CodexLogin {
  state: "idle" | "starting" | "pending" | "connected" | "cancelled" | "error";
  url?: string;
  code?: string;
  message?: string;
}
export interface CodexStatus {
  installed: boolean;
  authenticated: boolean;
  authMode: "chatgpt" | "apiKey" | "none";
  message: string;
  login: CodexLogin;
}
export type ProviderId = keyof typeof providerNames;
export interface PublicConfig {
  active: ProviderId;
  providers: Record<
    ProviderId,
    { model: string; baseUrl: string; hasKey: boolean; fastMode: boolean }
  >;
}
export async function aiRequest<T>(
  path: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(`/api/ai/${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Physics-Lab": "1",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal,
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("Сервис ИИ временно недоступен. Попробуйте позже.");
  }
  if (!response.ok)
    throw new Error(
      data &&
        typeof data === "object" &&
        "error" in data &&
        typeof data.error === "string"
        ? data.error
        : "Запрос не выполнен",
    );
  return data as T;
}
