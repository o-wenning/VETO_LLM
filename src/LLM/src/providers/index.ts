import type { LLMConfig } from "../types";
import { OllamaProvider } from "./ollama";
import type { LLMProvider } from "./provider";

export type { LLMProvider } from "./provider";
export { OllamaProvider, DEFAULT_OLLAMA_URL } from "./ollama";

export function createProvider(config: LLMConfig): LLMProvider {
  switch (config.provider) {
    case "ollama":
      return new OllamaProvider(config);
    default:
      throw new Error(`Unsupported LLM provider: ${(config as { provider: string }).provider}`);
  }
}
