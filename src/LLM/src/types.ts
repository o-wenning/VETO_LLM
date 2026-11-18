/** A column of the dataset currently viewed in Veto. */
export interface ColumnSpec {
  name: string;
  /** Free-form data type description passed in by the caller (e.g. "text", "number", "enum: a|b"). */
  type: string;
}

/** A hit as returned by the LLM. */
export interface RawHit {
  /** Name of one of the requested columns. */
  attribute: string;
  value: string | number;
  /** 0-based character index in the text where the LLM says the value starts. */
  index: number;
}

/**
 * A validated hit with resolved character offsets (`end` is exclusive).
 * `start` equals `index` if the LLM was exact; otherwise it is the nearest actual occurrence of `value`.
 */
export interface AnnotationHit extends RawHit {
  start: number;
  end: number;
}

export type AnnotationResult = AnnotationHit[];

/** A single hit of the LLM response that was discarded because it is invalid. */
export interface InvalidHit {
  /** Position in the `annotations` array. */
  position: number;
  /** The hit as returned by the LLM. */
  hit: unknown;
  reason: string;
}

/** Called for every discarded hit. */
export type InvalidHitHandler = (invalid: InvalidHit) => void;

export interface OllamaConfig {
  provider: "ollama";
  model: string;
  /** Defaults to http://localhost:11434 */
  baseUrl?: string;
  /** Passed through as Ollama `options` (e.g. temperature, seed, num_ctx). */
  options?: Record<string, unknown>;
  /** Ollama `think` flag for reasoning models (e.g. false to disable thinking). Omitted if undefined. */
  think?: boolean | "low" | "medium" | "high";
  timeoutMs?: number;
}

export type LLMConfig = OllamaConfig;

export interface CompletionRequest {
  prompt: string;
  /** JSON schema the response must conform to. */
  schema: Record<string, unknown>;
}
