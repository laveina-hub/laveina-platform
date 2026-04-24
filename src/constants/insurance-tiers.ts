// A3 (client answer 2026-04-21): 8-tier insurance matrix. Declared value is
// in *cents*; the helper returns the insurance cost in cents. The max coverage
// is 5,000 € — declared values above that clamp to the top tier.
//
// Tier table (euros → cost):
//   0          → 0.00
//   0.01–50    → 1.50
//   51–100     → 2.50
//   101–200    → 4.00
//   201–500    → 8.00
//   501–1000   → 15.00
//   1001–2000  → 25.00
//   2001–5000  → 50.00 (max coverage)

export type InsuranceTier = {
  /** Human label shown in the reference table (e.g. "101–200 €"). */
  labelKey: string;
  /** Upper bound of declared value covered by this tier, in cents. */
  maxDeclaredValueCents: number;
  /** Insurance cost (cents) for this tier. */
  costCents: number;
};

export const MAX_INSURED_VALUE_CENTS = 500_000;

export const INSURANCE_TIERS: readonly InsuranceTier[] = [
  { labelKey: "insuranceTier.upTo50", maxDeclaredValueCents: 5000, costCents: 150 },
  { labelKey: "insuranceTier.upTo100", maxDeclaredValueCents: 10_000, costCents: 250 },
  { labelKey: "insuranceTier.upTo200", maxDeclaredValueCents: 20_000, costCents: 400 },
  { labelKey: "insuranceTier.upTo500", maxDeclaredValueCents: 50_000, costCents: 800 },
  { labelKey: "insuranceTier.upTo1000", maxDeclaredValueCents: 100_000, costCents: 1500 },
  { labelKey: "insuranceTier.upTo2000", maxDeclaredValueCents: 200_000, costCents: 2500 },
  { labelKey: "insuranceTier.upTo5000", maxDeclaredValueCents: 500_000, costCents: 5000 },
] as const;

/**
 * Returns the insurance cost in cents for a declared value (cents).
 *   - 0 (or negative) → 0 cost (no insurance)
 *   - Declared > 5000 € → clamps to top tier (50 €)
 * Pure, deterministic — safe for SSR + test use.
 */
export function getInsuranceCostCents(declaredValueCents: number): number {
  if (!Number.isFinite(declaredValueCents) || declaredValueCents <= 0) return 0;

  const clamped = Math.min(Math.round(declaredValueCents), MAX_INSURED_VALUE_CENTS);
  for (const tier of INSURANCE_TIERS) {
    if (clamped <= tier.maxDeclaredValueCents) return tier.costCents;
  }
  // Unreachable (the last tier equals the clamp ceiling) — fall back defensively.
  return INSURANCE_TIERS[INSURANCE_TIERS.length - 1].costCents;
}

/**
 * Q9.4 — coverage cap (in cents) for a declared value. Mirrors
 * `getInsuranceCostCents` but returns the tier's maxDeclaredValueCents so
 * the UI can display "Coverage up to €X" without reconstructing the tier.
 * Returns 0 when the declared value is 0 / negative / invalid.
 */
export function getInsuranceCoverageCapCents(declaredValueCents: number): number {
  if (!Number.isFinite(declaredValueCents) || declaredValueCents <= 0) return 0;

  const clamped = Math.min(Math.round(declaredValueCents), MAX_INSURED_VALUE_CENTS);
  for (const tier of INSURANCE_TIERS) {
    if (clamped <= tier.maxDeclaredValueCents) return tier.maxDeclaredValueCents;
  }
  return INSURANCE_TIERS[INSURANCE_TIERS.length - 1].maxDeclaredValueCents;
}
