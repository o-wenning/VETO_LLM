import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { annotate, type LLMProvider } from "../src";

const template = readFileSync(fileURLToPath(new URL("../prompts/annotate.md", import.meta.url)), "utf8");

describe("annotate", () => {
  it("fills the prompt, passes the schema and validates the response", async () => {
    let seen: { prompt: string; schema: Record<string, unknown> } | undefined;
    const provider: LLMProvider = {
      async complete(req) {
        seen = req;
        return '{"annotations":[{"attribute":"Name","value":"Anna","index":10}]}';
      },
    };
    const result = await annotate({
      template,
      columns: [{ name: "Name", type: "text" }],
      text: "Patientin Anna, 34 Jahre.",
      config: { provider: "ollama", model: "unused" },
      provider,
    });
    expect(result).toEqual([{ attribute: "Name", value: "Anna", index: 10, start: 10, end: 14 }]);
    expect(seen?.prompt).toContain("- Name (text)");
    expect(seen?.prompt).toContain("Patientin Anna, 34 Jahre.");
    expect(seen?.prompt).toContain('"annotations"');
    expect(seen?.schema).toMatchObject({ required: ["annotations"] });
  });

  it("rejects empty column lists", async () => {
    await expect(
      annotate({ template, columns: [], text: "x", config: { provider: "ollama", model: "unused" } }),
    ).rejects.toThrow(/At least one column/);
  });

  it("rejects duplicate column names", async () => {
    await expect(
      annotate({
        template,
        columns: [
          { name: "A", type: "text" },
          { name: "A", type: "text" },
        ],
        text: "x",
        config: { provider: "ollama", model: "unused" },
      }),
    ).rejects.toThrow(/unique/);
  });
});
