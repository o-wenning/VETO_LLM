import type { AnnotationHit, AnnotationResult, ColumnSpec, InvalidHitHandler } from "./types";

export class ResponseValidationError extends Error {
  constructor(message: string, public readonly raw: string) {
    super(message);
    this.name = "ResponseValidationError";
  }
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function findAllOccurrences(text: string, needle: string): number[] {
  const result: number[] = [];
  if (needle.length === 0) return result;
  for (let i = text.indexOf(needle); i !== -1; i = text.indexOf(needle, i + 1)) {
    result.push(i);
  }
  return result;
}

export function resolveStart(text: string, needle: string, index: number): number {
  const occurrences = findAllOccurrences(text, needle);
  if (occurrences.length === 0) return -1;
  if (occurrences.includes(index)) return index;
  return occurrences.reduce((best, pos) => (Math.abs(pos - index) < Math.abs(best - index) ? pos : best));
}

export const warnInvalidHit: InvalidHitHandler = ({ position, hit, reason }) => {
  console.warn(`LLM annotation: discarded annotations[${position}]: ${reason}`, hit);
};

export function parseAndValidate(
  raw: string,
  columns: ColumnSpec[],
  text: string,
  onInvalidHit: InvalidHitHandler = warnInvalidHit,
): AnnotationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new ResponseValidationError(`Response is not valid JSON: ${(e as Error).message}`, raw);
  }
  if (!isPlainObject(parsed)) {
    throw new ResponseValidationError("Response is not a JSON object.", raw);
  }
  const keys = Object.keys(parsed);
  if (keys.length !== 1 || keys[0] !== "annotations") {
    throw new ResponseValidationError(`Response must have exactly the key 'annotations', got [${keys.join(", ")}].`, raw);
  }
  const hits = parsed.annotations;
  if (!Array.isArray(hits)) {
    throw new ResponseValidationError("'annotations' is not an array.", raw);
  }

  const names = new Set(columns.map((c) => c.name));
  const result: AnnotationResult = [];
  hits.forEach((hit, position) => {
    const checked = validateHit(hit, names, text);
    if (typeof checked === "string") {
      onInvalidHit({ position, hit, reason: checked });
    } else {
      result.push(checked);
    }
  });
  return result;
}

function validateHit(hit: unknown, names: Set<string>, text: string): AnnotationHit | string {
  if (!isPlainObject(hit)) return "not an object.";
  const hitKeys = Object.keys(hit);
  if (hitKeys.length !== 3 || !("attribute" in hit) || !("value" in hit) || !("index" in hit)) {
    return "must have exactly the keys 'attribute', 'value' and 'index'.";
  }
  const { attribute, value, index } = hit;
  if (typeof attribute !== "string" || !names.has(attribute)) {
    return `attribute '${String(attribute)}' is not a known column.`;
  }
  if (typeof value !== "string" && typeof value !== "number") {
    return "value must be a string or number.";
  }
  if (typeof index !== "number" || !Number.isInteger(index) || index < 0) {
    return "index must be an integer >= 0.";
  }
  const needle = String(value);
  const start = resolveStart(text, needle, index);
  if (start === -1) {
    return `value '${needle}' not found in text.`;
  }
  return { attribute, value, index, start, end: start + needle.length };
}
