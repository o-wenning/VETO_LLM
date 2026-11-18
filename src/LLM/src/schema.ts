import type { ColumnSpec } from "./types";

/** JSON schema: {"annotations": [{attribute, value, index}]}, `attribute` restricted to the column names. */
export function buildResponseSchema(columns: ColumnSpec[]): Record<string, unknown> {
  return {
    type: "object",
    properties: {
      annotations: {
        type: "array",
        items: {
          type: "object",
          properties: {
            attribute: { type: "string", enum: columns.map((c) => c.name) },
            value: { type: ["string", "number"] },
            index: { type: "integer", minimum: 0 },
          },
          required: ["attribute", "value", "index"],
          additionalProperties: false,
        },
      },
    },
    required: ["annotations"],
    additionalProperties: false,
  };
}
