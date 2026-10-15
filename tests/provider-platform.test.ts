import { expect, it } from "vitest";
import {
  providers,
  providerURL,
  providerHeaders,
  parseModels,
} from "../sites/physics-lab/lib/provider-registry";
import { sealKey, openKey } from "../sites/physics-lab/lib/provider-store";
it("восемь сервисов имеют собственные API и каталоги моделей", () => {
  expect(Object.keys(providers)).toHaveLength(8);
  expect(providerURL("deepseek", "chat")).toBe(
    "https://api.deepseek.com/chat/completions",
  );
  expect(providerURL("qwen", "models")).toBe(
    "https://dashscope-intl.aliyuncs.com/api/v1/models",
  );
  expect(providerURL("nvidia", "chat")).toBe(
    "https://integrate.api.nvidia.com/v1/chat/completions",
  );
  expect(providerURL("ollama", "models")).toBe("https://ollama.com/api/tags");
  expect(providerHeaders("anthropic", "key")["x-api-key"]).toBe("key");
  expect(providerHeaders("gemini", "key")["x-goog-api-key"]).toBe("key");
  expect(parseModels("ollama", { models: [{ name: "qwen3:8b" }] })).toEqual([
    { id: "qwen3:8b", name: "qwen3:8b" },
  ]);
  expect(
    parseModels("gemini", {
      models: [
        {
          name: "models/gemini-test",
          displayName: "Gemini",
          supportedGenerationMethods: ["generateContent"],
        },
        { name: "models/embed", supportedGenerationMethods: ["embedContent"] },
      ],
    }),
  ).toEqual([{ id: "gemini-test", name: "Gemini" }]);
});
it("адрес Ollama не допускает внутреннюю сеть, HTTP, пароль и произвольный путь", () => {
  for (const url of [
    "http://localhost:11434",
    "https://127.0.0.1",
    "https://[::1]",
    "https://metadata.google.internal",
    "https://a:b@example.com",
    "https://example.com/private",
    "https://example.com?x=1",
  ])
    expect(() => providerURL("ollama", "chat", url)).toThrow();
  expect(providerURL("ollama", "chat", "https://ollama.example.org")).toBe(
    "https://ollama.example.org/api/chat",
  );
  expect(() =>
    providerURL("openrouter", "chat", "https://evil.test"),
  ).toThrow();
});
it("ключ шифруется случайным IV и привязан к владельцу и провайдеру", async () => {
  const master = btoa(
    String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))),
  );
  const a = await sealKey("test-secret", master, "owner|openrouter");
  const b = await sealKey("test-secret", master, "owner|openrouter");
  expect(a).not.toBe(b);
  expect(a).not.toContain("test-secret");
  expect(await openKey(a, master, "owner|openrouter")).toBe("test-secret");
  await expect(openKey(a, master, "other|openrouter")).rejects.toThrow();
  await expect(openKey(a, master, "owner|deepseek")).rejects.toThrow();
});
it("каталог Qwen использует output.models[].model", () => {
  expect(
    parseModels("qwen", {
      output: { models: [{ model: "qwen-test", name: "Qwen test" }] },
    }),
  ).toEqual([{ id: "qwen-test", name: "Qwen test" }]);
});
