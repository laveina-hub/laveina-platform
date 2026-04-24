import { describe, expect, it } from "vitest";

// Tests mirror the math in `src/services/pricing.service.ts` without importing
// the service (the real module depends on Supabase + SendCloud clients that
// aren't available in the unit-test sandbox). Both implementations MUST stay
// in sync — if this math changes, update the service and vice versa.
//
// Pricing formula (client Q15.2):
//   Subtotal = Delivery (ex-VAT) + Insurance (ex-VAT)
//   VAT      = 21% × Subtotal
//   Total    = Subtotal + VAT

const IVA_RATE = 0.21;
const MINIMUM_SHIPPING_CENTS = 400;
const _DEFAULT_MARGIN_PERCENT = 25;

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

describe("pricing calculations", () => {
  describe("Q15.2 IVA calculation (21% on Delivery + Insurance)", () => {
    it("applies 21% IVA on delivery alone when insurance is zero", () => {
      const result = buildPriceOption({ shippingCents: 500, insuranceSurchargeCents: 0 });
      expect(result.subtotalCents).toBe(500); // delivery ex-VAT
      expect(result.ivaCents).toBe(105); // 21% of 500
      expect(result.totalCents).toBe(605); // subtotal + VAT
    });

    it("includes insurance in the VAT base per Q15.2", () => {
      // Q15.2 example: 4.95 + 1.50 = 6.45; VAT 21% = 1.35; total 7.80.
      const result = buildPriceOption({ shippingCents: 495, insuranceSurchargeCents: 150 });
      expect(result.subtotalCents).toBe(645); // 495 + 150
      expect(result.ivaCents).toBe(135); // round(645 * 0.21) = round(135.45) = 135
      expect(result.totalCents).toBe(780); // 645 + 135
    });

    it("rounds VAT to nearest cent", () => {
      const result = buildPriceOption({ shippingCents: 333, insuranceSurchargeCents: 0 });
      expect(result.ivaCents).toBe(70); // 333 × 0.21 = 69.93 → 70
    });

    it("handles zero shipping and zero insurance", () => {
      const result = buildPriceOption({ shippingCents: 0, insuranceSurchargeCents: 0 });
      expect(result.totalCents).toBe(0);
    });

    it("applies VAT to insurance-only subtotal (edge case: free shipping promo)", () => {
      const result = buildPriceOption({ shippingCents: 0, insuranceSurchargeCents: 150 });
      expect(result.subtotalCents).toBe(150);
      expect(result.ivaCents).toBe(32); // round(150 × 0.21) = 32 (31.5 → 32)
      expect(result.totalCents).toBe(182);
    });
  });

  describe("margin application", () => {
    it("applies 25% margin correctly", () => {
      expect(applyMargin(320, 25)).toBe(400);
    });

    it("applies margin and rounds to nearest cent", () => {
      expect(applyMargin(300, 25)).toBe(400); // hits minimum
    });

    it("respects minimum price floor of €4.00", () => {
      expect(applyMargin(100, 25)).toBe(400);
    });

    it("does not apply floor when result exceeds minimum", () => {
      expect(applyMargin(780, 25)).toBe(975);
    });

    it("handles 0% margin", () => {
      expect(applyMargin(500, 0)).toBe(500);
    });

    it("handles 50% margin", () => {
      expect(applyMargin(500, 50)).toBe(750);
    });

    it("floor applies even with 0% margin", () => {
      expect(applyMargin(200, 0)).toBe(400);
    });
  });

  describe("Barcelona internal pricing (ex-VAT matrix)", () => {
    // Matrix values are stored ex-VAT per Q15.2. VAT is added on top at quote
    // time — no reverse-calculation. Asserting the wizard's Small/Standard
    // (€4.95 ex-VAT) path produces the spec's 4.95 → 6.45 → 7.80 numbers with
    // insurance, and the VAT-only 4.95 → 5.99 path without.
    it("uses the matrix value directly as ex-VAT delivery (no back-calc)", () => {
      const matrixCents = 495; // small/standard per §15 matrix
      const result = buildPriceOption({ shippingCents: matrixCents, insuranceSurchargeCents: 0 });
      expect(result.subtotalCents).toBe(495);
      expect(result.ivaCents).toBe(104); // round(495 × 0.21) = round(103.95) = 104
      expect(result.totalCents).toBe(599);
    });

    it("matches Q15.2 worked example exactly", () => {
      // Delivery 4.95, Insurance 1.50 → Subtotal 6.45, VAT 1.35, Total 7.80.
      const result = buildPriceOption({ shippingCents: 495, insuranceSurchargeCents: 150 });
      expect(result.subtotalCents).toBe(645);
      expect(result.ivaCents).toBe(135);
      expect(result.totalCents).toBe(780);
    });
  });

  describe("SendCloud pricing (carrier rate + margin + floor + VAT)", () => {
    it("calculates full SendCloud price correctly", () => {
      const carrierRateCents = 320;
      const marginPercent = 25;
      const shippingCents = applyMargin(carrierRateCents, marginPercent);
      const result = buildPriceOption({ shippingCents, insuranceSurchargeCents: 100 });

      expect(shippingCents).toBe(400);
      // 400c ex-VAT delivery + 100c ex-VAT insurance = 500c subtotal
      // VAT 21% = 105c → total 605c
      expect(result.subtotalCents).toBe(500);
      expect(result.ivaCents).toBe(105);
      expect(result.totalCents).toBe(605);
    });

    it("applies minimum price when carrier rate is very low", () => {
      const shippingCents = applyMargin(100, 25);
      const result = buildPriceOption({ shippingCents, insuranceSurchargeCents: 0 });

      expect(shippingCents).toBe(400);
      expect(result.totalCents).toBe(484); // 400 + round(400 × 0.21) = 400 + 84
    });

    it("charges insurance exactly once and VATs the full subtotal", () => {
      const shippingCents = applyMargin(50, 25);
      const result = buildPriceOption({ shippingCents, insuranceSurchargeCents: 150 });
      expect(shippingCents).toBe(400);
      expect(result.subtotalCents).toBe(550); // 400 + 150
      expect(result.ivaCents).toBe(116); // round(550 × 0.21) = round(115.5) = 116
      expect(result.totalCents).toBe(666);
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

    it("handles empty string as 0", () => {
      expect(getSettingNumber({ key: "" }, "key", 50)).toBe(0);
    });
  });
});
