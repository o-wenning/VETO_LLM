import type { CompletionRequest } from "../types";

export interface LLMProvider {
  /** Sends the prompt and returns the raw text response (expected to be JSON). */
  complete(request: CompletionRequest): Promise<string>;
}
