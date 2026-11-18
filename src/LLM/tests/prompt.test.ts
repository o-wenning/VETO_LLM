import { describe, expect, it } from "vitest";
import { fillPrompt, formatColumns, OUTPUT_FORMAT_DESCRIPTION } from "../src/prompt";

const cols = [
  { name: "Name", type: "text" },
  { name: "Alter", type: "number" },
];

describe("fillPrompt", () => {
  it("fills columns and text", () => {
    const out = fillPrompt("C:\n{{columns}}\nT: {{ text }}", cols, "Hallo");
    expect(out).toBe("C:\n- Name (text)\n- Alter (number)\nT: Hallo");
  });

  it("does not substitute placeholders inside the inserted text", () => {
    expect(fillPrompt("{{columns}}|{{text}}", cols, "{{columns}}")).toBe(`${formatColumns(cols)}|{{columns}}`);
  });

  it("throws on missing placeholder", () => {
    expect(() => fillPrompt("{{columns}}", cols, "x")).toThrow(/missing.*\{\{text\}\}/);
  });

  it("throws on unknown placeholder", () => {
    expect(() => fillPrompt("{{columns}} {{text}} {{foo}}", cols, "x")).toThrow(/Unknown placeholder '\{\{foo\}\}'/);
  });

  it("fills the optional output_format placeholder", () => {
    expect(fillPrompt("{{columns}}{{text}}{{output_format}}", cols, "")).toContain(OUTPUT_FORMAT_DESCRIPTION);
  });

  it("renders {{examples}} as an empty string without examples", () => {
    expect(fillPrompt("A\n\n{{examples}}\nB{{columns}}{{text}}", cols, "")).toBe(`A\n\n\nB${formatColumns(cols)}`);
  });

  it("inserts examples with their expected output", () => {
    const out = fillPrompt("{{examples}}{{columns}}{{text}}", cols, "x", [
      { text: "Anna, 34", annotations: [{ attribute: "Name", value: "Anna", index: 0 }] },
    ]);
    expect(out).toContain("Beispiel 1:\n<EXAMPLE_DOCUMENT>\nAnna, 34\n</EXAMPLE_DOCUMENT>");
    expect(out).toContain('{"annotations":[{"attribute":"Name","value":"Anna","index":0}]}');
  });

  it("throws if examples are given but the template has no {{examples}}", () => {
    expect(() =>
      fillPrompt("{{columns}}{{text}}", cols, "x", [{ text: "y", annotations: [] }]),
    ).toThrow(/\{\{examples\}\}/);
  });
});
