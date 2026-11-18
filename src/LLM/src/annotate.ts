import { CURRENT_MODEL } from "./config";
import { fillPrompt } from "./prompt";
import { createProvider, type LLMProvider } from "./providers";
import { buildResponseSchema } from "./schema";
import type { AnnotationResult, ColumnSpec, InvalidHitHandler, LLMConfig, PromptExample } from "./types";
import { parseAndValidate } from "./validate";

export interface AnnotateParams {
  template: string;
  columns: ColumnSpec[];
  text: string;
  examples?: PromptExample[];
  config?: LLMConfig;
  provider?: LLMProvider;
  onInvalidHit?: InvalidHitHandler;
}

export async function annotate({ template, columns, text, examples, config, provider, onInvalidHit }: AnnotateParams): Promise<AnnotationResult> {
  const names = columns.map((c) => c.name);
  if (names.length === 0) {
    throw new Error("At least one column is required.");
  }
  if (new Set(names).size !== names.length) {
    throw new Error("Column names must be unique.");
  }
  const prompt = fillPrompt(template, columns, text, examples);
  const schema = buildResponseSchema(columns);
  const raw = await (provider ?? createProvider(config ?? CURRENT_MODEL)).complete({ prompt, schema });
  return parseAndValidate(raw, columns, text, onInvalidHit);
}
