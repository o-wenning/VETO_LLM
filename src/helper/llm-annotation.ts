import { annotate, EXPERIMENT_CONFIG, ResponseValidationError, type AnnotationResult, type ColumnSpec, type PromptExample, type RawHit } from "@/LLM/src";
import promptTemplate from "@/LLM/prompts/annotate.md?raw";
import Data from "@/types/Data";
import MetaData, { MetaAttributeType, ValidMetaAttribute } from "@/types/MetaData";

function metaAttributeType(meta: ValidMetaAttribute): string {
  switch (meta.type) {
    case MetaAttributeType.ENUM:
      return `enum: ${meta.values.join(" | ")}`;
    case MetaAttributeType.NUMBER:
      return "number";
    case MetaAttributeType.TEXT:
    default:
      return "text";
  }
}

/** Maps Veto's attributes and meta-attributes to column specs for the LLM. */
export function buildColumnSpecs(metaData: MetaData): ColumnSpec[] {
  const attributes = Object.entries(metaData.attributes).map(([name, attr]) => ({
    name,
    type: attr.validationRegEx ? `text, regex: ${attr.validationRegEx}` : "text",
  }));
  const metaAttributes = Object.entries(metaData.validMetaAttributes).map(([name, meta]) => ({
    name,
    type: metaAttributeType(meta),
  }));
  return [...attributes, ...metaAttributes];
}

function exampleValue(value: string, type: string): string | number {
  const num = Number(value);
  return type === "number" && value.trim() !== "" && Number.isFinite(num) ? num : value;
}

/** Converts a row's current annotations into a prompt example. */
export function rowToExample(row: Data, columns: ColumnSpec[]): PromptExample {
  const types = new Map(columns.map((c) => [c.name, c.type]));
  const annotations: RawHit[] = [];
  for (const [name, parts] of Object.entries(row.currentData.attributes)) {
    if (!types.has(name)) continue;
    for (const part of parts) {
      if (part.value === null || part.value === "" || part.start === null) continue;
      annotations.push({ attribute: name, value: exampleValue(part.value, types.get(name)!), index: part.start });
    }
  }
  for (const [name, values] of Object.entries(row.currentData.metaAttributes)) {
    if (!types.has(name)) continue;
    for (const meta of values) {
      if (meta.value === null || meta.value === "") continue;
      // Meta-attributes have no position; the LLM may only return values that occur in the text.
      const index = row.text.indexOf(meta.value);
      if (index === -1) continue;
      annotations.push({ attribute: name, value: exampleValue(meta.value, types.get(name)!), index });
    }
  }
  annotations.sort((a, b) => a.index - b.index);
  return { text: row.text, annotations };
}

/** The first checked rows (at most `maxExamples`) except the row to be annotated. */
export function collectExamples(data: Data[], rowIndex: number, columns: ColumnSpec[]): PromptExample[] {
  return data
    .filter((row, i) => i !== rowIndex && row.currentData.checked)
    .slice(0, EXPERIMENT_CONFIG.maxExamples)
    .map((row) => rowToExample(row, columns));
}

/** Runs the LLM annotation for one row and logs the result to the console. */
export async function runAiAnnotation(data: Data[], rowIndex: number, metaData: MetaData): Promise<AnnotationResult | null> {
  const columns = buildColumnSpecs(metaData);
  const examples = EXPERIMENT_CONFIG.useExamples ? collectExamples(data, rowIndex, columns) : [];
  console.log("AI annotation: columns", columns);
  if (EXPERIMENT_CONFIG.useExamples) {
    console.log("AI annotation: examples", examples);
  }
  try {
    const result = await annotate({ template: promptTemplate, columns, text: data[rowIndex].text, examples });
    console.log("AI annotation: result", result);
    return result;
  } catch (e) {
    if (e instanceof ResponseValidationError) {
      console.error(`AI annotation: invalid LLM response: ${e.message}`, e.raw);
    } else {
      console.error("AI annotation failed:", e);
    }
    return null;
  }
}
