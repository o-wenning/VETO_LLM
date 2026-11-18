import type { LLMConfig } from "./types";

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
