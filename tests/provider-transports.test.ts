import { it, expect, vi } from "vitest";
import { hostedAI } from "../sites/physics-lab/lib/hosted-ai";
import {
  providerIds,
  providers,
  providerURL,
} from "../sites/physics-lab/lib/provider-registry";
it.each(providerIds)(
  "%s: сервер отправляет текст в правильном формате и извлекает ответ",
  async (p) => {
    const fetcher = vi.fn(
      async (_url: any, _init: any) =>
        new Response(
          JSON.stringify(
            p === "anthropic"
              ? { content: [{ type: "text", text: "Готово" }] }
              : p === "gemini"
                ? { candidates: [{ content: { parts: [{ text: "Готово" }] } }] }
                : p === "ollama"
                  ? { message: { content: "Готово" } }
                  : {
                      choices: [
                        {
                          message: { content: "Готово" },
                          finish_reason: "stop",
                        },
                      ],
                    },
          ),
        ),
    );
    const request = new Request("https://lab.example/api/ai/chat", {
      method: "POST",
      headers: {
        "oai-authenticated-user-id": "owner",
        "X-Physics-Lab": "1",
        "X-Physics-Provider": p,
        "X-Physics-Model": "test-model",
        Origin: "https://lab.example",
      },
      body: JSON.stringify({
        kind: "chat",
        context: "Справочная формула",
        messages: [{ role: "user", content: "Объясни" }],
      }),
    });
    const result = await hostedAI(
      request,
      { [providers[p].keyEnv]: "fake-key" },
      fetcher,
    );
    expect(result.status).toBe(200);
    expect((await result.json()).text).toBe("Готово");
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe(
      p === "gemini"
        ? "https://generativelanguage.googleapis.com/v1beta/models/test-model:generateContent"
        : providerURL(p, "chat"),
    );
    const body = JSON.parse(init.body);
    expect(JSON.stringify(body)).toContain("Объясни");
    expect(JSON.stringify(body)).not.toContain("fake-key");
    expect(init.redirect).toBe("manual");
    if (p === "anthropic") expect(init.headers["x-api-key"]).toBe("fake-key");
    else if (p === "gemini")
      expect(init.headers["x-goog-api-key"]).toBe("fake-key");
    else expect(init.headers.Authorization).toBe("Bearer fake-key");
  },
);
