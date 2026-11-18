import type { CompletionRequest, OllamaConfig } from "../types";
import type { LLMProvider } from "./provider";

export const DEFAULT_OLLAMA_URL = "http://localhost:11434";

export class OllamaProvider implements LLMProvider {
  constructor(
    private readonly config: OllamaConfig,
    private readonly fetchFn: typeof fetch = (...args) => fetch(...args),
  ) {}

  async complete({ prompt, schema }: CompletionRequest): Promise<string> {
    const baseUrl = (this.config.baseUrl ?? DEFAULT_OLLAMA_URL).replace(/\/+$/, "");
    const controller = new AbortController();
    const timer = this.config.timeoutMs ? setTimeout(() => controller.abort(), this.config.timeoutMs) : undefined;

    try {
      const response = await this.fetchFn(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.config.model,
          messages: [{ role: "user", content: prompt }],
          stream: false,
          format: schema,
          ...(this.config.options ? { options: this.config.options } : {}),
          ...(this.config.think !== undefined ? { think: this.config.think } : {}),
        }),
      });
      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`Ollama request failed (${response.status} ${response.statusText}): ${body}`);
      }
      const data = (await response.json()) as { message?: { content?: unknown }; done_reason?: string };
      if (data.done_reason === "length") {
        throw new Error(
          "Ollama response was truncated (done_reason=length). Increase options.num_ctx/num_predict or disable thinking.",
        );
      }
      const content = data.message?.content;
      if (typeof content !== "string") {
        throw new Error("Ollama response does not contain message.content.");
      }
      return content;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
