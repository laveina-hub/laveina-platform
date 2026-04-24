import { describe, expect, it } from "vitest";

import caMessages from "./messages/ca.json";
import enMessages from "./messages/en.json";
import esMessages from "./messages/es.json";

// S7.1 — locale-parity guard. Catches drift the moment someone adds a key
// to one file and forgets the others. Runs as part of `npm run test:run`
// and blocks the pre-commit hook once Husky picks up vitest.

type Messages = Record<string, unknown>;

function flattenKeys(node: unknown, prefix = "", out: string[] = []): string[] {
  if (node === null || typeof node !== "object" || Array.isArray(node)) {
    return out;
  }
  for (const [k, v] of Object.entries(node as Messages)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      flattenKeys(v, key, out);
    } else {
      out.push(key);
    }
  }
  return out;
}

const es = new Set(flattenKeys(esMessages));
const ca = new Set(flattenKeys(caMessages));
const en = new Set(flattenKeys(enMessages));

function difference(a: Set<string>, b: Set<string>): string[] {
  return [...a].filter((k) => !b.has(k)).sort();
}

describe("locale-parity guard", () => {
  it("es and ca have the same key set", () => {
    expect(difference(es, ca)).toEqual([]);
    expect(difference(ca, es)).toEqual([]);
  });

  it("es and en have the same key set", () => {
    expect(difference(es, en)).toEqual([]);
    expect(difference(en, es)).toEqual([]);
  });

  it("ca and en have the same key set", () => {
    expect(difference(ca, en)).toEqual([]);
    expect(difference(en, ca)).toEqual([]);
  });

  it("every locale has a non-zero number of keys", () => {
    expect(es.size).toBeGreaterThan(0);
    expect(ca.size).toBeGreaterThan(0);
    expect(en.size).toBeGreaterThan(0);
  });
});
