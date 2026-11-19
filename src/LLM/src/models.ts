import type { LLMConfig, VLLMConfig } from "./types";

export const gemma4: LLMConfig = {
  provider: "ollama",
  model: "gemma4:12b",
  think: false,
  options: { temperature: 0, num_ctx: 32768, num_predict: 8192 },
};

export const qwen2_5: LLMConfig = {
  provider: "ollama",
  model: "qwen2.5:7b",
  think: false,
  options: { temperature: 0, num_ctx: 32768, num_predict: 8192 },
};

const config: VLLMConfig = {
  baseUrl: "http://localhost:8000",
  model: "Qwen/Qwen3-8B",
  timeoutMs: 60_000,
  options: {
    temperature: 0,
    max_tokens: 4096,
  },
};
