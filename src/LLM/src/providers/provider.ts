import type { CompletionRequest } from "../types";

export interface LLMProvider {
  complete(request: CompletionRequest): Promise<string>;
}
