import { CURRENT_MODEL } from "./models";
import { fillPrompt } from "./prompt";
import { createProvider, type LLMProvider } from "./providers";
import { buildResponseSchema } from "./schema";
import type { AnnotationResult, ColumnSpec, InvalidHitHandler, LLMConfig } from "./types";
import { parseAndValidate } from "./validate";

export interface AnnotateParams {
  /** Prompt template containing {{columns}} and {{text}}. */
  template: string;
  columns: ColumnSpec[];
  text: string;
  /** Defaults to CURRENT_MODEL from models.ts. */
  config?: LLMConfig;
  /** Optional provider override (e.g. for tests or custom backends). */
  provider?: LLMProvider;
  /** Called for every invalid hit that is discarded (default: console.warn). */
  onInvalidHit?: InvalidHitHandler;
}

export async function annotate({ template, columns, text, config, provider, onInvalidHit }: AnnotateParams): Promise<AnnotationResult> {
  const names = columns.map((c) => c.name);
  if (names.length === 0) {
    throw new Error("At least one column is required.");
  }
  if (new Set(names).size !== names.length) {
    throw new Error("Column names must be unique.");
  }
  const prompt = fillPrompt(template, columns, text);
  const schema = buildResponseSchema(columns);
  const raw = await (provider ?? createProvider(config ?? CURRENT_MODEL)).complete({ prompt, schema });
  return parseAndValidate(raw, columns, text, onInvalidHit);
}
