# veto-llm

LLM assist for [Veto](../../README.md). Standalone subproject: it **must not import anything from Veto**
(no `@/…`, Vue, Pinia). Veto may import it. No runtime dependencies (only `fetch`), so it runs in the browser
and in Node.

## Usage

```ts
import { annotate } from "@/LLM/src";
import template from "@/LLM/prompts/annotate.md?raw"; // Vite; in Node use fs.readFileSync

const result = await annotate({
  template,
  columns: [{ name: "Medikament", type: "text" }, { name: "Dosis", type: "number" }],
  text: "Aspirin 100 mg morgens, Aspirin 100 mg abends.",
  config: { provider: "ollama", model: "qwen2.5:7b", options: { temperature: 0 } },
});
// [{ attribute: "Medikament", value: "Aspirin", index: 0, start: 0, end: 7 }, ...]
```

### Prompt template
- Placeholders: `{{columns}}` (rendered as `- name (type)` lines) and `{{text}}` are required.
- `{{output_format}}` is optional and is replaced by `OUTPUT_FORMAT_DESCRIPTION` (describes the JSON format below).
- `{{examples}}` is optional and is replaced by the `examples` passed to `annotate` (document + expected JSON output);
  without examples it is replaced by an empty string. Passing examples to a template without `{{examples}}` throws.
- Unknown placeholders throw.

### Experiment settings (`src/config.ts`)
| Field | Description |
|---|---|
| `useExamples` | If `true`, Veto adds the first checked texts (excluding the annotated one) with their annotations as examples to the prompt. Default `false` (no examples). |
| `maxExamples` | Maximum number of examples (default `2`). |

### Response
- The LLM is constrained via Ollama structured outputs (`format` = JSON schema).
- Format: `{"annotations": [{"attribute": <column name>, "value": <string|number>, "index": <0-based start>}]}`.
  One entry per hit; an attribute may have several or none.
- An invalid structure (no JSON, root not exactly `{"annotations": [...]}`) throws `ResponseValidationError` (with `.raw`).
- Invalid single hits (unknown attribute, wrong types, value not in the text) are discarded and reported via
  `onInvalidHit` (parameter of `annotate`/`parseAndValidate`, default `console.warn`); the other hits are kept.
- `start`/`end` (exclusive) are computed: `start = index` if the value
  is exactly there, otherwise the nearest occurrence of the value (LLMs often miscount characters).

### Config (Ollama)
| Field | Description |
|---|---|
| `model` | Model name, e.g. `qwen2.5:7b` |
| `baseUrl` | Default `http://localhost:11434` |
| `options` | Ollama options (`temperature`, `num_ctx`, `seed`, …) |
| `think` | For reasoning models; `false` disables thinking (it can otherwise exhaust the context) |
| `timeoutMs` | Request timeout |

Additional providers implement `LLMProvider` (`src/providers/provider.ts`) and are registered in `createProvider`.

## Development
```sh
cd src/LLM
npm install
npm test            # vitest
npm run typecheck
npm run cli -- --model qwen2.5:7b --temperature 0 --columns "Name:text,Alter:number" --text "Anna ist 34."
#   further flags: --text-file <path>, --prompt <path>, --base-url <url>, --timeout-ms <n>, --no-think
```
