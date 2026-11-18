import { describe, expect, it, vi } from "vitest";
import { OllamaProvider } from "../src/providers/ollama";
import { createProvider } from "../src/providers";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("OllamaProvider", () => {
  it("posts to /api/chat with schema as format and returns content", async () => {
    const fetchFn = vi.fn(async () => jsonResponse({ message: { content: '{"A":[]}' } }));
    const provider = new OllamaProvider(
      { provider: "ollama", model: "llama3", baseUrl: "http://host:1234/", options: { temperature: 0 } },
      fetchFn as unknown as typeof fetch,
    );
    const schema = { type: "object" };
    await expect(provider.complete({ prompt: "P", schema })).resolves.toBe('{"A":[]}');

    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://host:1234/api/chat");
    expect(JSON.parse(init.body as string)).toEqual({
      model: "llama3",
      messages: [{ role: "user", content: "P" }],
      stream: false,
      format: schema,
      options: { temperature: 0 },
    });
  });

  it("throws on HTTP error", async () => {
    const fetchFn = vi.fn(async () => new Response("model not found", { status: 404, statusText: "Not Found" }));
    const provider = new OllamaProvider({ provider: "ollama", model: "x" }, fetchFn as unknown as typeof fetch);
    await expect(provider.complete({ prompt: "P", schema: {} })).rejects.toThrow(/404.*model not found/);
  });

  it("throws if content is missing", async () => {
    const fetchFn = vi.fn(async () => jsonResponse({}));
    const provider = new OllamaProvider({ provider: "ollama", model: "x" }, fetchFn as unknown as typeof fetch);
    await expect(provider.complete({ prompt: "P", schema: {} })).rejects.toThrow(/message.content/);
  });

  it("passes think flag and rejects truncated responses", async () => {
    const fetchFn = vi.fn(async () => jsonResponse({ message: { content: "" }, done_reason: "length" }));
    const provider = new OllamaProvider({ provider: "ollama", model: "x", think: false }, fetchFn as unknown as typeof fetch);
    await expect(provider.complete({ prompt: "P", schema: {} })).rejects.toThrow(/truncated/);
    const [, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string).think).toBe(false);
  });
});

describe("createProvider", () => {
  it("creates an Ollama provider", () => {
    expect(createProvider({ provider: "ollama", model: "x" })).toBeInstanceOf(OllamaProvider);
  });

  it("rejects unknown providers", () => {
    expect(() => createProvider({ provider: "nope" } as never)).toThrow(/Unsupported/);
  });
});
