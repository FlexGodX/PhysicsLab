import { expect, it, vi } from "vitest";
import { hostedAI } from "../sites/physics-lab/lib/hosted-ai";
function request(
  path = "config",
  input?: unknown,
  headers: Record<string, string> = {},
) {
  return new Request(`https://physics.test/api/ai/${path}`, {
    method: input ? "POST" : "GET",
    headers: {
      "oai-authenticated-user-id": "owner",
      "X-Physics-Lab": "1",
      Origin: "https://physics.test",
      "Content-Type": "application/json",
      ...headers,
    },
    ...(input ? { body: JSON.stringify(input) } : {}),
  });
}
it("hosted API requires visitor identity and same-origin requests", async () => {
  expect(
    (await hostedAI(new Request("https://physics.test/api/ai/config"), {}))
      .status,
  ).toBe(401);
  expect(
    (
      await hostedAI(
        request("chat", { kind: "test" }, { Origin: "https://evil.test" }),
        {},
      )
    ).status,
  ).toBe(403);
});
it("public config never reveals environment keys; local agents are unavailable", async () => {
  const r = await hostedAI(request(), { OPENROUTER_API_KEY: "secret-key" });
  const body = await r.json();
  expect(body.providers.openrouter.hasKey).toBe(true);
  expect(JSON.stringify(body)).not.toContain("secret-key");
  const codex = await hostedAI(request("codex/status"), {});
  expect((await codex.json()).installed).toBe(false);
});
it("missing key, invalid provider and key uploads fail before an upstream call", async () => {
  const fetcher = vi.fn();
  const input = {
    kind: "chat",
    messages: [{ role: "user", content: "Объясни силу" }],
  };
  expect((await hostedAI(request("chat", input), {}, fetcher)).status).toBe(
    503,
  );
  expect(
    (
      await hostedAI(
        request("chat", input, { "X-Physics-Provider": "codex" }),
        {},
        fetcher,
      )
    ).status,
  ).toBe(400);
  expect(
    (await hostedAI(request("config", { apiKey: "do-not-save" }), {}, fetcher))
      .status,
  ).toBe(400);
  expect(fetcher).not.toHaveBeenCalled();
});
it("upstream receives only a fixed provider endpoint, and modules pass the existing parser", async () => {
  const draft = {
    title: "Сила",
    objective: "Понять силу",
    sections: [{ title: "Закон", body: "Сила определяет ускорение." }],
    example: "2 Н / 1 кг = 2 м/с².",
    questions: Array.from({ length: 5 }, (_, i) => ({
      prompt: `Вопрос ${i + 1}`,
      options: ["Н", "м"],
      correctIndex: 0,
      explanation: "Ньютон — единица силы.",
    })),
    visualizations: [],
  };
  const fetcher = vi.fn(
    async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: { content: JSON.stringify(draft) },
              finish_reason: "stop",
            },
          ],
        }),
        { headers: { "content-type": "application/json" } },
      ),
  );
  const r = await hostedAI(
    request(
      "chat",
      { kind: "module", messages: [{ role: "user", content: "Сила" }] },
      { "X-Physics-Model": "test-model" },
    ),
    { OPENROUTER_API_KEY: "secret-key" },
    fetcher,
  );
  expect(r.status).toBe(200);
  expect((await r.json()).draft.title).toBe("Сила");
  expect(fetcher.mock.calls[0][0]).toBe(
    "https://openrouter.ai/api/v1/chat/completions",
  );
  expect(
    new Headers(fetcher.mock.calls[0][1]?.headers).get("Authorization"),
  ).toBe("Bearer secret-key");
});
