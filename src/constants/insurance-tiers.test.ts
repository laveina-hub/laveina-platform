import { describe, expect, it } from "vitest";

import { INSURANCE_TIERS, MAX_INSURED_VALUE_CENTS, getInsuranceCostCents } from "./insurance-tiers";

// Expected cost values straight from client A3 (2026-04-21):
//   0 → 0 · ≤50€ → 1.50 · ≤100€ → 2.50 · ≤200€ → 4.00 · ≤500€ → 8.00
//   ≤1000€ → 15.00 · ≤2000€ → 25.00 · ≤5000€ → 50.00 (max)

describe("insurance-tiers", () => {
  describe("getInsuranceCostCents", () => {
    it("returns 0 for no declared value (0 cents)", () => {
      expect(getInsuranceCostCents(0)).toBe(0);
    });

    it("returns 0 for negative / invalid input (safety)", () => {
      expect(getInsuranceCostCents(-1)).toBe(0);
      expect(getInsuranceCostCents(Number.NaN)).toBe(0);
      expect(getInsuranceCostCents(Number.POSITIVE_INFINITY)).toBe(0);
    });

    it("tier 1: 0.01 € → 50 € → 1.50 €", () => {
      expect(getInsuranceCostCents(1)).toBe(150);
      expect(getInsuranceCostCents(2500)).toBe(150);
      expect(getInsuranceCostCents(5000)).toBe(150);
    });

    it("tier 2: 50.01 € → 100 € → 2.50 €", () => {
      expect(getInsuranceCostCents(5001)).toBe(250);
      expect(getInsuranceCostCents(7500)).toBe(250);
      expect(getInsuranceCostCents(10_000)).toBe(250);
    });

    it("tier 3: 100.01 € → 200 € → 4.00 €", () => {
      expect(getInsuranceCostCents(10_001)).toBe(400);
      expect(getInsuranceCostCents(15_000)).toBe(400);
      expect(getInsuranceCostCents(20_000)).toBe(400);
    });

    it("tier 4: 200.01 € → 500 € → 8.00 €", () => {
      expect(getInsuranceCostCents(20_001)).toBe(800);
      expect(getInsuranceCostCents(35_000)).toBe(800);
      expect(getInsuranceCostCents(50_000)).toBe(800);
    });

    it("tier 5: 500.01 € → 1000 € → 15.00 €", () => {
      expect(getInsuranceCostCents(50_001)).toBe(1500);
      expect(getInsuranceCostCents(75_000)).toBe(1500);
      expect(getInsuranceCostCents(100_000)).toBe(1500);
    });

    it("tier 6: 1000.01 € → 2000 € → 25.00 €", () => {
      expect(getInsuranceCostCents(100_001)).toBe(2500);
      expect(getInsuranceCostCents(150_000)).toBe(2500);
      expect(getInsuranceCostCents(200_000)).toBe(2500);
    });

    it("tier 7 (max): 2000.01 € → 5000 € → 50.00 €", () => {
      expect(getInsuranceCostCents(200_001)).toBe(5000);
      expect(getInsuranceCostCents(350_000)).toBe(5000);
      expect(getInsuranceCostCents(MAX_INSURED_VALUE_CENTS)).toBe(5000);
    });

    it("clamps declared values above 5000 € to top tier", () => {
      expect(getInsuranceCostCents(500_001)).toBe(5000);
      expect(getInsuranceCostCents(1_000_000)).toBe(5000);
    });

    it("rounds fractional cent inputs to the nearest cent", () => {
      // 50.005 € = 5000.5 cents — rounds to 5001 → tier 2 (2.50 €)
      expect(getInsuranceCostCents(5000.5)).toBe(250);
      // 49.995 € = 4999.5 cents — rounds to 5000 → tier 1 (1.50 €)
      expect(getInsuranceCostCents(4999.5)).toBe(150);
    });

    it("covers every configured tier", () => {
      // One sample inside each tier's window.
      const samples = INSURANCE_TIERS.map((tier) => tier.maxDeclaredValueCents);
      const costs = samples.map(getInsuranceCostCents);
      expect(costs).toEqual(INSURANCE_TIERS.map((t) => t.costCents));
    });
  });
});
