export interface ColumnSpec {
  name: string;
  type: string;
}
export interface RawHit {
  attribute: string;
  value: string | number;
  index: number;
}

export interface PromptExample {
  text: string;
  annotations: RawHit[];
}

export interface AnnotationHit extends RawHit {
  start: number;
  end: number;
}

export type AnnotationResult = AnnotationHit[];

export interface InvalidHit {
  position: number;
  hit: unknown;
  reason: string;
}

/** Called for every discarded hit. */
export type InvalidHitHandler = (invalid: InvalidHit) => void;

export interface OllamaConfig {
  provider: "ollama";
  model: string;
  /** http://localhost:11434 */
  baseUrl?: string;
  options?: Record<string, unknown>;
  think?: boolean | "low" | "medium" | "high";
  timeoutMs?: number;
}

export type LLMConfig = OllamaConfig;

export interface CompletionRequest {
  prompt: string;
  schema: Record<string, unknown>;
}
