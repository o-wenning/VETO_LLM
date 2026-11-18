import type { ColumnSpec } from "./types";

const PLACEHOLDER = /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g;
const REQUIRED = ["columns", "text"] as const;
const OPTIONAL = ["output_format"] as const;
const KNOWN: readonly string[] = [...REQUIRED, ...OPTIONAL];

/** Description of the expected output, matching `buildResponseSchema`. Inserted for `{{output_format}}`. */
export const OUTPUT_FORMAT_DESCRIPTION = `Gib ein JSON-Objekt der folgenden Form zurück:
{"annotations": [{"attribute": "<Attributname>", "value": "<gefundener Wert>", "index": <Startindex>}]}
- "attribute": exakt einer der oben genannten Attributnamen.
- "value": der Wert genau so, wie er im Dokument steht (Zahlen als JSON-Zahl).
- "index": 0-basierte Zeichenposition im Dokument, an der der Wert beginnt.
- Jeder Fund ist ein eigener Eintrag. Ein Attribut kann mehrere Einträge haben.
- Wird ein Attribut nicht gefunden, gibt es dafür keinen Eintrag.`;

export function formatColumns(columns: ColumnSpec[]): string {
  return columns.map((c) => `- ${c.name} (${c.type})`).join("\n");
}

/**
 * Fills `{{columns}}`, `{{text}}` and the optional `{{output_format}}` in the template.
 * Throws if a required placeholder is missing or an unknown one is present.
 */
export function fillPrompt(template: string, columns: ColumnSpec[], text: string): string {
  const found = new Set<string>();
  for (const match of template.matchAll(PLACEHOLDER)) {
    const name = match[1];
    if (!KNOWN.includes(name)) {
      throw new Error(`Unknown placeholder '{{${name}}}' in prompt template.`);
    }
    found.add(name);
  }
  const missing = REQUIRED.filter((k) => !found.has(k));
  if (missing.length > 0) {
    throw new Error(`Prompt template is missing placeholder(s): ${missing.map((m) => `{{${m}}}`).join(", ")}`);
  }

  const values: Record<string, string> = {
    columns: formatColumns(columns),
    text,
    output_format: OUTPUT_FORMAT_DESCRIPTION,
  };
  // Single pass so that placeholders inside the inserted text are not substituted again.
  return template.replace(PLACEHOLDER, (_, name: string) => values[name]);
}
