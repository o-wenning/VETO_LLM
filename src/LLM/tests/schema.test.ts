import { describe, expect, it } from "vitest";
import { buildResponseSchema } from "../src/schema";

describe("buildResponseSchema", () => {
  it("describes a flat list of {attribute, value, index} restricted to the columns", () => {
    const schema = buildResponseSchema([
      { name: "A", type: "text" },
      { name: "B", type: "number" },
    ]);
    expect(schema).toMatchObject({
      required: ["annotations"],
      additionalProperties: false,
      properties: {
        annotations: {
          type: "array",
          items: {
            required: ["attribute", "value", "index"],
            additionalProperties: false,
            properties: { attribute: { enum: ["A", "B"] }, index: { type: "integer", minimum: 0 } },
          },
        },
      },
    });
  });
});
