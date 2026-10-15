export const providers = {
  openrouter: {
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    keyEnv: "OPENROUTER_API_KEY",
  },
  openai: {
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    keyEnv: "OPENAI_API_KEY",
  },
  anthropic: {
    name: "Anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    keyEnv: "ANTHROPIC_API_KEY",
  },
  gemini: {
    name: "Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    keyEnv: "GEMINI_API_KEY",
  },
  deepseek: {
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    keyEnv: "DEEPSEEK_API_KEY",
  },
  qwen: {
    name: "Qwen / Alibaba Cloud",
    baseUrl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    keyEnv: "QWEN_API_KEY",
  },
  nvidia: {
    name: "NVIDIA NIM",
    baseUrl: "https://integrate.api.nvidia.com/v1",
    keyEnv: "NVIDIA_API_KEY",
  },
  ollama: {
    name: "Ollama",
    baseUrl: "https://ollama.com",
    keyEnv: "OLLAMA_API_KEY",
  },
} as const;
export type Provider = keyof typeof providers;
export const providerIds = Object.keys(providers) as Provider[];
export function baseAddress(p: Provider, value = "") {
  const base = (value || providers[p].baseUrl).replace(/\/$/, "");
  if (p === "qwen") {
    if (
      ![
        "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
        "https://dashscope.aliyuncs.com/compatible-mode/v1",
        "https://dashscope-us.aliyuncs.com/compatible-mode/v1",
      ].includes(base)
    )
      throw new Error("Выберите регион Qwen из списка.");
  } else if (p === "ollama") {
    const u = new URL(base);
    if (
      u.protocol !== "https:" ||
      u.username ||
      u.password ||
      u.search ||
      u.hash ||
      u.pathname !== "/" ||
      u.port ||
      !u.hostname.includes(".") ||
      /^[\d.]+$/.test(u.hostname) ||
      u.hostname.includes(":") ||
      /(^|\.)(localhost|local|internal|test|invalid|arpa)$/.test(u.hostname)
    )
      throw new Error(
        "Ollama: укажите общедоступный HTTPS-адрес без пути, порта и пароля. Локальный адрес хостингу недоступен.",
      );
  } else if (base !== providers[p].baseUrl)
    throw new Error("Адрес этого провайдера фиксирован.");
  return base;
}
export function providerURL(
  p: Provider,
  operation: "models" | "chat",
  base = "",
) {
  const b = baseAddress(p, base);
  if (p === "ollama")
    return b + (operation === "models" ? "/api/tags" : "/api/chat");
  if (p === "qwen" && operation === "models")
    return new URL("/api/v1/models", b).href;
  if (p === "gemini") return b + "/models";
  return (
    b +
    (operation === "models"
      ? "/models"
      : p === "anthropic"
        ? "/messages"
        : "/chat/completions")
  );
}
export function providerHeaders(
  p: Provider,
  key: string,
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (p === "anthropic") {
    headers["x-api-key"] = key;
    headers["anthropic-version"] = "2023-06-01";
  } else if (p === "gemini") headers["x-goog-api-key"] = key;
  else if (key) headers.Authorization = `Bearer ${key}`;
  return headers;
}
export type ModelOption = { id: string; name: string };
export function parseModels(p: Provider, data: any): ModelOption[] {
  const rows =
    p === "ollama"
      ? data?.models
      : p === "gemini"
        ? data?.models
        : (data?.data ?? data?.output?.models);
  if (!Array.isArray(rows))
    throw new Error(
      "Сервис вернул неизвестный формат списка моделей. Можно ввести модель вручную.",
    );
  const seen = new Set<string>();
  return rows
    .filter(
      (m: any) =>
        p !== "gemini" ||
        !Array.isArray(m.supportedGenerationMethods) ||
        m.supportedGenerationMethods.includes("generateContent"),
    )
    .flatMap((m: any) => {
      const id =
        p === "ollama"
          ? m.name
          : p === "gemini"
            ? m.name?.replace(/^models\//, "")
            : typeof m === "string"
              ? m
              : (m.id ?? m.model ?? m.model_name);
      if (typeof id !== "string" || !id || id.length > 200 || seen.has(id))
        return [];
      seen.add(id);
      return [
        { id, name: String(m.displayName ?? m.name ?? id).slice(0, 250) },
      ];
    })
    .slice(0, 3000)
    .sort((a, b) => a.name.localeCompare(b.name));
}
