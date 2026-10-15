import { it, expect } from "vitest";
import {
  providerRequest,
  providerText,
  validateProvider,
} from "../server/providers";
it("формирует пять протоколов и извлекает текст, не принимая пустой ответ", () => {
  const messages = [{ role: "user" as const, content: "Почему F=kx?" }];
  for (const provider of [
    "lmstudio",
    "openrouter",
    "openai",
    "anthropic",
    "gemini",
  ] as const) {
    const request = providerRequest(
      {
        provider,
        model: "test-model",
        apiKey: "secret",
        baseUrl: "http://127.0.0.1:1234/v1",
      },
      "Физика",
      messages,
    );
    expect(request.url).not.toContain("secret");
    const payload =
      provider === "anthropic"
        ? { content: [{ type: "text", text: "Закон упругости" }] }
        : provider === "gemini"
          ? {
              candidates: [
                { content: { parts: [{ text: "Закон упругости" }] } },
              ],
            }
          : {
              choices: [
                {
                  message: { content: "Закон упругости" },
                  finish_reason: "stop",
                },
              ],
            };
    expect(providerText(provider, payload)).toBe("Закон упругости");
    expect(() => providerText(provider, {})).toThrow();
  }
});
it("не отправляет ключ на произвольный адрес или адрес с credentials", () => {
  expect(() =>
    validateProvider({
      provider: "lmstudio",
      model: "x",
      apiKey: "",
      baseUrl: "https://evil.test/v1",
    }),
  ).toThrow();
  expect(() =>
    validateProvider({
      provider: "lmstudio",
      model: "x",
      apiKey: "",
      baseUrl: "http://user:password@localhost:1234/v1",
    }),
  ).toThrow();
  expect(() =>
    providerText("openai", {
      choices: [{ message: { content: '{"half":' }, finish_reason: "length" }],
    }),
  ).toThrow();
});
it("быстрый режим LM Studio отключает рассуждения только в локальном запросе и не хранит чат на сервере модели", () => {
  const c = validateProvider({
    provider: "lmstudio",
    model: "qwen/qwen3.5-9b",
    apiKey: "",
    baseUrl: "http://127.0.0.1:1234/v1",
    fastMode: true,
  });
  const r = providerRequest(c, "Объясняй физику", [
    { role: "user", content: "Что такое сила?" },
  ]);
  expect(r.url).toBe("http://127.0.0.1:1234/api/v1/chat");
  expect(r.body).toMatchObject({ reasoning: "off", store: false });
  expect(
    providerText("lmstudio", {
      output: [
        { type: "reasoning", content: "не показывать" },
        { type: "message", content: "Сила — мера взаимодействия." },
      ],
    }),
  ).toBe("Сила — мера взаимодействия.");
});
it("Codex принимает пустую модель и не сохраняет API-ключ", () => {
  const config = validateProvider({
    provider: "codex",
    model: "",
    apiKey: "must-not-store",
  });
  expect(config).toMatchObject({ provider: "codex", model: "", apiKey: "" });
});
