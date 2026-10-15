export const cloudProviders = [
  "openrouter",
  "openai",
  "anthropic",
  "gemini",
  "deepseek",
  "qwen",
  "nvidia",
  "ollama",
] as const;
export type CloudProvider = (typeof cloudProviders)[number];
const storageKey = "physics-lab-hosted-ai";
export function hostedChoice(): { provider: CloudProvider; model: string } {
  try {
    const c = JSON.parse(localStorage.getItem(storageKey) || "{}");
    if (
      cloudProviders.includes(c.provider) &&
      typeof c.model === "string" &&
      c.model.length <= 200
    )
      return { provider: c.provider, model: c.model };
  } catch {}
  return { provider: "openrouter", model: "" };
}
export function saveHostedChoice(provider: CloudProvider, model: string) {
  localStorage.setItem(
    storageKey,
    JSON.stringify({ provider, model: model.trim() }),
  );
}
