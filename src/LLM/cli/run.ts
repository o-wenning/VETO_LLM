/**
 * Try the annotation against a local Ollama instance.
 *
 *   npm run cli -- --model llama3.2 --columns "Name:text,Alter:number" --text "Anna ist 34 Jahre alt."
 *   npm run cli -- --model llama3.2 --columns "Name:text" --text-file ./sample.txt --prompt ./prompts/annotate.md
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { annotate, ResponseValidationError, type ColumnSpec } from "../src";

const { values } = parseArgs({
  options: {
    model: { type: "string" },
    "base-url": { type: "string" },
    prompt: { type: "string", default: fileURLToPath(new URL("../prompts/annotate.md", import.meta.url)) },
    columns: { type: "string" },
    text: { type: "string" },
    "text-file": { type: "string" },
    temperature: { type: "string" },
    "timeout-ms": { type: "string" },
    "no-think": { type: "boolean" },
  },
});

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

if (!values.model) fail("--model is required");
if (!values.columns) fail('--columns is required, e.g. "Name:text,Alter:number"');
const text = values.text ?? (values["text-file"] ? readFileSync(values["text-file"], "utf8") : undefined);
if (text === undefined) fail("--text or --text-file is required");

const columns: ColumnSpec[] = values.columns.split(",").map((part) => {
  const idx = part.indexOf(":");
  return idx === -1
    ? { name: part.trim(), type: "text" }
    : { name: part.slice(0, idx).trim(), type: part.slice(idx + 1).trim() };
});

let result;
try {
  result = await annotate({
  template: readFileSync(values.prompt!, "utf8"),
  columns,
  text,
  config: {
    provider: "ollama",
    model: values.model,
    baseUrl: values["base-url"],
    options: values.temperature !== undefined ? { temperature: Number(values.temperature) } : undefined,
    timeoutMs: values["timeout-ms"] !== undefined ? Number(values["timeout-ms"]) : undefined,
    think: values["no-think"] ? false : undefined,
  },
  });
} catch (e) {
  if (e instanceof ResponseValidationError) {
    console.error(`Invalid LLM response: ${e.message}\n--- raw response ---\n${e.raw}`);
    process.exit(2);
  }
  throw e;
}

console.log(JSON.stringify(result, null, 2));
