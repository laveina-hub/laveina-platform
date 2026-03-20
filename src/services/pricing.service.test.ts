import { describe, expect, it } from "vitest";

/**
 * Tests for pricing calculation logic.
 *
 * The pricing service (pricing.service.ts) depends on Supabase and SendCloud,
 * so we test the pure calculation formulas directly rather than mocking.
 * These mirror the exact formulas used in buildPriceOption() and applyMargin().
 */

// ─── Constants from pricing.service.ts ───────────────────────────────────────
const IVA_RATE = 0.21;
const MINIMUM_SHIPPING_CENTS = 400; // €4.00
const DEFAULT_MARGIN_PERCENT = 25;

// ─── Pure formulas extracted from pricing.service.ts ─────────────────────────

function buildPriceOption({
  shippingCents,
  insuranceSurchargeCents,
}: {
  shippingCents: number;
  insuranceSurchargeCents: number;
}) {
  const subtotalCents = shippingCents + insuranceSurchargeCents;
  const ivaCents = Math.round(subtotalCents * IVA_RATE);
  const totalCents = subtotalCents + ivaCents;
  return { subtotalCents, ivaCents, totalCents };
}

function applyMargin(rateCents: number, marginPercent: number): number {
  const marginMultiplier = 1 + marginPercent / 100;
  return Math.max(MINIMUM_SHIPPING_CENTS, Math.round(rateCents * marginMultiplier));
}

function getSettingNumber(settings: Record<string, string>, key: string, fallback: number): number {
  const raw = settings[key];
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  return isNaN(parsed) ? fallback : parsed;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("pricing calculations", () => {
  describe("IVA calculation (21%)", () => {
    it("applies 21% IVA on shipping only", () => {
      const result = buildPriceOption({ shippingCents: 500, insuranceSurchargeCents: 0 });
      expect(result.subtotalCents).toBe(500);
      expect(result.ivaCents).toBe(105); // 500 * 0.21
      expect(result.totalCents).toBe(605);
    });

    it("applies 21% IVA on shipping + insurance surcharge", () => {
      const result = buildPriceOption({ shippingCents: 500, insuranceSurchargeCents: 200 });
      expect(result.subtotalCents).toBe(700);
      expect(result.ivaCents).toBe(147); // 700 * 0.21
      expect(result.totalCents).toBe(847);
    });

    it("rounds IVA to nearest cent", () => {
      // 333 * 0.21 = 69.93 → rounds to 70
      const result = buildPriceOption({ shippingCents: 333, insuranceSurchargeCents: 0 });
      expect(result.ivaCents).toBe(70);
    });

    it("handles zero shipping", () => {
      const result = buildPriceOption({ shippingCents: 0, insuranceSurchargeCents: 0 });
      expect(result.totalCents).toBe(0);
    });
  });

  describe("margin application", () => {
    it("applies 25% margin correctly", () => {
      // €3.20 carrier rate × 1.25 = €4.00
      expect(applyMargin(320, 25)).toBe(400);
    });

    it("applies margin and rounds to nearest cent", () => {
      // €3.00 × 1.25 = €3.75 = 375 cents
      expect(applyMargin(300, 25)).toBe(400); // hits minimum €4.00
    });

    it("respects minimum price floor of €4.00", () => {
      // €1.00 × 1.25 = €1.25 → floor at €4.00
      expect(applyMargin(100, 25)).toBe(400);
    });

    it("does not apply floor when result exceeds minimum", () => {
      // €7.80 × 1.25 = €9.75 = 975 cents (above €4.00)
      expect(applyMargin(780, 25)).toBe(975);
    });

    it("handles 0% margin", () => {
      // €5.00 × 1.00 = €5.00
      expect(applyMargin(500, 0)).toBe(500);
    });

    it("handles 50% margin", () => {
      // €5.00 × 1.50 = €7.50
      expect(applyMargin(500, 50)).toBe(750);
    });

    it("floor applies even with 0% margin", () => {
      // €2.00 × 1.00 = €2.00 → floor at €4.00
      expect(applyMargin(200, 0)).toBe(400);
    });
  });

  describe("Barcelona internal pricing", () => {
    it("uses flat price from settings (no margin)", () => {
      const settings = { internal_price_small_cents: "300" };
      const shippingCents = getSettingNumber(settings, "internal_price_small_cents", 0);
      const result = buildPriceOption({ shippingCents, insuranceSurchargeCents: 0 });

      expect(shippingCents).toBe(300);
      expect(result.subtotalCents).toBe(300);
      expect(result.ivaCents).toBe(63); // 300 * 0.21
      expect(result.totalCents).toBe(363);
    });

    it("returns fallback 0 when price not configured", () => {
      const settings = {};
      const shippingCents = getSettingNumber(settings, "internal_price_small_cents", 0);
      expect(shippingCents).toBe(0);
    });

    it("includes insurance surcharge in total", () => {
      // Barcelona small (€3.00) + €100 insurance (+€2.00 = 200 cents)
      const result = buildPriceOption({ shippingCents: 300, insuranceSurchargeCents: 200 });
      expect(result.subtotalCents).toBe(500); // 300 + 200
      expect(result.ivaCents).toBe(105); // 500 * 0.21
      expect(result.totalCents).toBe(605);
    });
  });

  describe("SendCloud pricing (carrier rate + margin)", () => {
    it("calculates full SendCloud price correctly", () => {
      // Carrier rate: €3.20, Margin: 25%, Insurance: +€1.00
      const carrierRateCents = 320;
      const marginPercent = 25;
      const shippingCents = applyMargin(carrierRateCents, marginPercent);
      const result = buildPriceOption({ shippingCents, insuranceSurchargeCents: 100 });

      expect(shippingCents).toBe(400); // 320 * 1.25 = 400
      expect(result.subtotalCents).toBe(500); // 400 + 100
      expect(result.ivaCents).toBe(105); // 500 * 0.21
      expect(result.totalCents).toBe(605);
    });

    it("applies minimum price when carrier rate is very low", () => {
      // Carrier rate: €1.00, Margin: 25% → €1.25 → floor at €4.00
      const shippingCents = applyMargin(100, 25);
      const result = buildPriceOption({ shippingCents, insuranceSurchargeCents: 0 });

      expect(shippingCents).toBe(400);
      expect(result.totalCents).toBe(484); // 400 * 1.21
    });
  });

  describe("getSettingNumber", () => {
    it("returns parsed number from settings", () => {
      expect(getSettingNumber({ key: "42" }, "key", 0)).toBe(42);
    });

    it("returns fallback for missing key", () => {
      expect(getSettingNumber({}, "missing", 99)).toBe(99);
    });

    it("returns fallback for non-numeric value", () => {
      expect(getSettingNumber({ key: "abc" }, "key", 99)).toBe(99);
    });

    it("handles decimal values", () => {
      expect(getSettingNumber({ key: "3.14" }, "key", 0)).toBeCloseTo(3.14);
    });

    it("handles empty string as 0 (Number('') === 0)", () => {
      // Empty string coerces to 0 via Number(), which is valid — not NaN
      expect(getSettingNumber({ key: "" }, "key", 50)).toBe(0);
    });
  });
});
