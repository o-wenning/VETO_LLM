import { annotate, ResponseValidationError, type AnnotationResult, type ColumnSpec } from "@/LLM/src";
import promptTemplate from "@/LLM/prompts/annotate.md?raw";
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

/** Runs the LLM annotation for one text and logs the result to the console. */
export async function runAiAnnotation(text: string, metaData: MetaData): Promise<AnnotationResult | null> {
  const columns = buildColumnSpecs(metaData);
  console.log("AI annotation: columns", columns);
  try {
    const result = await annotate({ template: promptTemplate, columns, text });
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
