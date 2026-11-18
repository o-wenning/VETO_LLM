import { describe, expect, it, vi } from "vitest";
import { findAllOccurrences, parseAndValidate, resolveStart, ResponseValidationError } from "../src/validate";

const cols = [
  { name: "Medikament", type: "text" },
  { name: "Dosis", type: "number" },
];
const text = "Aspirin 100 mg morgens, Aspirin 100 mg abends.";
const wrap = (annotations: unknown) => JSON.stringify({ annotations });

describe("findAllOccurrences / resolveStart", () => {
  it("finds all occurrences", () => {
    expect(findAllOccurrences(text, "Aspirin")).toEqual([0, 24]);
    expect(findAllOccurrences(text, "")).toEqual([]);
  });

  it("uses the exact index or snaps to the nearest occurrence", () => {
    expect(resolveStart(text, "Aspirin", 24)).toBe(24);
    expect(resolveStart(text, "Aspirin", 20)).toBe(24);
    expect(resolveStart(text, "Aspirin", 3)).toBe(0);
    expect(resolveStart(text, "Ibuprofen", 0)).toBe(-1);
  });
});

describe("parseAndValidate", () => {
  it("resolves offsets for multiple hits per attribute", () => {
    const raw = wrap([
      { attribute: "Medikament", value: "Aspirin", index: 24 },
      { attribute: "Dosis", value: 100, index: 8 },
      { attribute: "Dosis", value: "100", index: 30 },
    ]);
    expect(parseAndValidate(raw, cols, text)).toEqual([
      { attribute: "Medikament", value: "Aspirin", index: 24, start: 24, end: 31 },
      { attribute: "Dosis", value: 100, index: 8, start: 8, end: 11 },
      { attribute: "Dosis", value: "100", index: 30, start: 32, end: 35 },
    ]);
  });

  it("accepts an empty list", () => {
    expect(parseAndValidate(wrap([]), cols, text)).toEqual([]);
  });

  it.each([
    ["invalid JSON", "{nope", /not valid JSON/],
    ["non-object", "[]", /not a JSON object/],
    ["wrong root key", '{"hits":[]}', /exactly the key 'annotations'/],
    ["extra root key", '{"annotations":[],"x":1}', /exactly the key 'annotations'/],
    ["non-array", '{"annotations":{}}', /not an array/],
  ])("rejects %s", (_, raw, message) => {
    expect(() => parseAndValidate(raw, cols, text)).toThrow(ResponseValidationError);
    expect(() => parseAndValidate(raw, cols, text)).toThrow(message);
  });

  const valid = { attribute: "Medikament", value: "Aspirin", index: 0 };
  it.each([
    ["non-object hit", "x", /not an object/],
    ["extra hit key", { attribute: "Dosis", value: 100, index: 8, x: 1 }, /exactly the keys/],
    ["unknown attribute", { attribute: "X", value: "Aspirin", index: 0 }, /not a known column/],
    ["bad value type", { attribute: "Dosis", value: true, index: 0 }, /string or number/],
    ["bad index", { attribute: "Dosis", value: 100, index: -1 }, /integer >= 0/],
    ["value not in text", { attribute: "Medikament", value: "Ibuprofen", index: 0 }, /not found/],
  ])("discards %s, reports it and keeps the other hits", (_, hit, message) => {
    const reported: unknown[] = [];
    const result = parseAndValidate(wrap([hit, valid]), cols, text, (invalid) => reported.push(invalid));
    expect(result).toEqual([{ ...valid, start: 0, end: 7 }]);
    expect(reported).toEqual([{ position: 0, hit, reason: expect.stringMatching(message) }]);
  });

  it("warns on the console by default", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(parseAndValidate(wrap([{ attribute: "X", value: "a", index: 0 }]), cols, text)).toEqual([]);
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });
});
