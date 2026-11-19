
import type { CompletionRequest, VLLMConfig } from "../types";
import type { LLMProvider } from "./provider";

export const DEFAULT_VLLM_URL = "http://localhost:8000";

export class VLLMProvider implements LLMProvider {
  constructor(
    private readonly config: VLLMConfig,
    private readonly fetchFn: typeof fetch = (...args) => fetch(...args),
  ) {}

  async complete({ prompt, schema }: CompletionRequest): Promise<string> {
    const baseUrl = (this.config.baseUrl ?? DEFAULT_VLLM_URL).replace(/\/+$/, "");
    const controller = new AbortController();
    const timer = this.config.timeoutMs
      ? setTimeout(() => controller.abort(), this.config.timeoutMs)
      : undefined;

    try {
      const response = await this.fetchFn(`${baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.config.apiKey
            ? { Authorization: `Bearer ${this.config.apiKey}` }
            : {}),
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.config.model,
          messages: [{ role: "user", content: prompt }],
          stream: false,
          ...(schema
            ? {
                response_format: {
                  type: "json_schema",
                  json_schema: {
                    name: "response",
                    strict: true,
                    schema,
                  },
                },
              }
            : {}),
          ...(this.config.options ?? {}),
        }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(
          `vLLM request failed (${response.status} ${response.statusText}): ${body}`,
        );
      }

      const data = (await response.json()) as {
        choices?: Array<{
          message?: { content?: unknown };
          finish_reason?: string;
        }>;
      };

      const choice = data.choices?.[0];

      if (choice?.finish_reason === "length") {
        throw new Error(
          "vLLM response was truncated (finish_reason=length). Increase max_tokens or the model's context length.",
        );
      }

      const content = choice?.message?.content;

      if (typeof content !== "string") {
        throw new Error(
          "vLLM response does not contain choices[0].message.content.",
        );
      }

      return content;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
