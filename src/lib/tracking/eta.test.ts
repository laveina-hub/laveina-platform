import { describe, expect, it } from "vitest";

import { computeEta, formatEtaRange } from "./eta";

describe("computeEta", () => {
  const created = new Date("2026-04-23T10:00:00.000Z");

  it("returns +1 day for next_day", () => {
    const eta = computeEta(created, "next_day");
    expect(eta).not.toBeNull();
    expect(eta!.from.toISOString()).toBe("2026-04-24T10:00:00.000Z");
    expect(eta!.to.toISOString()).toBe("2026-04-24T10:00:00.000Z");
  });

  it("returns +2 days for express", () => {
    const eta = computeEta(created, "express");
    expect(eta).not.toBeNull();
    expect(eta!.from.toISOString()).toBe("2026-04-25T10:00:00.000Z");
    expect(eta!.to.toISOString()).toBe("2026-04-25T10:00:00.000Z");
  });

  it("returns +2 to +3 day range for standard", () => {
    const eta = computeEta(created, "standard");
    expect(eta).not.toBeNull();
    expect(eta!.from.toISOString()).toBe("2026-04-25T10:00:00.000Z");
    expect(eta!.to.toISOString()).toBe("2026-04-26T10:00:00.000Z");
  });

  it("returns null for unknown speed", () => {
    expect(computeEta(created, null)).toBeNull();
  });

  it("returns null for invalid date", () => {
    expect(computeEta("not-a-date", "standard")).toBeNull();
  });
});

describe("formatEtaRange", () => {
  it("renders a single day for same-day from/to", () => {
    const eta = computeEta(new Date("2026-04-23T10:00:00.000Z"), "next_day");
    const label = formatEtaRange(eta, "en");
    expect(label).toBeTruthy();
    expect(label).not.toContain("–");
  });

  it("renders a range for multi-day windows", () => {
    const eta = computeEta(new Date("2026-04-23T10:00:00.000Z"), "standard");
    const label = formatEtaRange(eta, "en");
    expect(label).toContain("–");
  });

  it("returns null when eta is null", () => {
    expect(formatEtaRange(null, "en")).toBeNull();
  });
});
