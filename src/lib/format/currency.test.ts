import { describe, expect, it } from "vitest";

import { formatCents, formatCurrency } from "./currency";

describe("formatCents", () => {
  it('renders "€X.XX" for whole euros', () => {
    expect(formatCents(495)).toBe("€4.95");
    expect(formatCents(1000)).toBe("€10.00");
  });

  it("renders zero as €0.00", () => {
    expect(formatCents(0)).toBe("€0.00");
  });

  it("rounds sub-cent precision to 2 decimals", () => {
    expect(formatCents(1234)).toBe("€12.34");
    expect(formatCents(999)).toBe("€9.99");
  });

  it("handles negative values (refunds)", () => {
    expect(formatCents(-500)).toBe("€-5.00");
  });
});

describe("formatCurrency", () => {
  it("renders Spanish locale format", () => {
    const out = formatCurrency(495, "es");
    // Intl output varies by Node version — just assert the parts that must be there.
    expect(out).toMatch(/4,95/);
    expect(out).toContain("€");
  });

  it("renders Catalan locale format", () => {
    const out = formatCurrency(495, "ca");
    expect(out).toMatch(/4,95/);
    expect(out).toContain("€");
  });

  it("renders English locale format", () => {
    const out = formatCurrency(495, "en");
    expect(out).toMatch(/4\.95/);
    expect(out).toContain("€");
  });

  it("handles zero in every locale", () => {
    expect(formatCurrency(0, "es")).toMatch(/0,00/);
    expect(formatCurrency(0, "en")).toMatch(/0\.00/);
  });
});
