import { describe, expect, it, vi } from "vitest";

// `resolveParcelForPricing` is pure, but importing it pulls in the full
// pricing service module — which transitively loads env validation + the
// Supabase admin client. Stub those out so the pure function can be unit-
// tested without a live infra stack.

vi.mock("@/services/admin-settings.service", () => ({
  getAllSettings: vi.fn().mockResolvedValue({}),
  getSettingNumber: vi.fn((_: unknown, __: string, fallback: number) => fallback),
  getSettingString: vi.fn((_: unknown, __: string, fallback: string) => fallback),
}));
vi.mock("@/services/sendcloud.service", () => ({
  getAvailableRates: vi.fn().mockResolvedValue({ data: null, error: { status: 503 } }),
}));

import { DEFAULT_PARCEL_PRESETS } from "@/constants/parcel-preset-defaults";

const { resolveParcelForPricing } = await import("./pricing.service");

// Contract: maps the booking wizard's two parcel shapes (preset pick vs
// custom dimensions) onto a preset/band for pricing.
// Route-aware weight selection:
//   - internal (BCN): billable = max(actual, volumetric). Laveina's flat
//     bands need volumetric to avoid undercharging giant light boxes.
//   - sendcloud: actual weight only for the preset/band mapping. Real
//     dimensions are forwarded separately to SendCloud's v3
//     /shipping-options so each carrier applies its own volumetric rule
//     server-side — we don't pre-compute volumetric here.

describe("resolveParcelForPricing — preset parcels", () => {
  it("returns preset + actual weight on BCN route", () => {
    const resolved = resolveParcelForPricing(
      { presetSlug: "small", weightKg: 3.2 },
      DEFAULT_PARCEL_PRESETS,
      "internal"
    );
    expect(resolved).toEqual({ presetSlug: "small", billableWeightKg: 3.2 });
  });

  it("returns preset + actual weight on SendCloud route", () => {
    const resolved = resolveParcelForPricing(
      { presetSlug: "small", weightKg: 3.2 },
      DEFAULT_PARCEL_PRESETS,
      "sendcloud"
    );
    expect(resolved).toEqual({ presetSlug: "small", billableWeightKg: 3.2 });
  });

  it("returns null when preset_slug references an unknown preset", () => {
    const resolved = resolveParcelForPricing({ presetSlug: "medium", weightKg: 6 }, [], "internal");
    expect(resolved).toBeNull();
  });
});

describe("resolveParcelForPricing — custom dims on BCN (uses volumetric)", () => {
  it("maps huge-light box to preset via volumetric weight", () => {
    // 40×40×37 cm at 3 kg → volumetric 9.87 kg → medium band.
    const resolved = resolveParcelForPricing(
      { presetSlug: null, weightKg: 3, lengthCm: 40, widthCm: 40, heightCm: 37 },
      DEFAULT_PARCEL_PRESETS,
      "internal"
    );
    expect(resolved?.presetSlug).toBe("medium");
    expect(resolved?.billableWeightKg).toBeCloseTo(9.867, 2);
  });

  it("prefers actual weight when heavier than volumetric", () => {
    // 30×20×20 at 4 kg → volumetric 2 kg, actual 4 kg → billable 4 → small band.
    const resolved = resolveParcelForPricing(
      { presetSlug: null, weightKg: 4, lengthCm: 30, widthCm: 20, heightCm: 20 },
      DEFAULT_PARCEL_PRESETS,
      "internal"
    );
    expect(resolved?.presetSlug).toBe("small");
    expect(resolved?.billableWeightKg).toBe(4);
  });

  it("returns null when billable exceeds M2 cap", () => {
    const resolved = resolveParcelForPricing(
      { presetSlug: null, weightKg: 25, lengthCm: 55, widthCm: 55, heightCm: 39 },
      DEFAULT_PARCEL_PRESETS,
      "internal"
    );
    expect(resolved).toBeNull();
  });
});

describe("resolveParcelForPricing — custom dims on SendCloud (actual weight only)", () => {
  it("maps huge-light box to preset via actual weight, ignoring volumetric", () => {
    // Same 40×40×37 @ 3 kg box as BCN test above. Under SendCloud rules,
    // volumetric (9.87 kg) is ignored → actual 3 kg → small band.
    const resolved = resolveParcelForPricing(
      { presetSlug: null, weightKg: 3, lengthCm: 40, widthCm: 40, heightCm: 37 },
      DEFAULT_PARCEL_PRESETS,
      "sendcloud"
    );
    expect(resolved?.presetSlug).toBe("small");
    expect(resolved?.billableWeightKg).toBe(3);
  });

  it("passes actual weight even when dims are massive", () => {
    // Oversized box declared as 2 kg. SendCloud charges by declared weight,
    // so the resolved pricing weight must match what we send to their API.
    const resolved = resolveParcelForPricing(
      { presetSlug: null, weightKg: 2, lengthCm: 55, widthCm: 55, heightCm: 39 },
      DEFAULT_PARCEL_PRESETS,
      "sendcloud"
    );
    expect(resolved?.presetSlug).toBe("mini");
    expect(resolved?.billableWeightKg).toBe(2);
  });

  it("returns null when actual weight exceeds M2 cap", () => {
    const resolved = resolveParcelForPricing(
      { presetSlug: null, weightKg: 25, lengthCm: 55, widthCm: 55, heightCm: 39 },
      DEFAULT_PARCEL_PRESETS,
      "sendcloud"
    );
    expect(resolved).toBeNull();
  });
});

describe("resolveParcelForPricing — validation", () => {
  it("returns null for custom dims with missing fields", () => {
    const resolved = resolveParcelForPricing(
      { presetSlug: null, weightKg: 2, lengthCm: 30, widthCm: 20 },
      DEFAULT_PARCEL_PRESETS,
      "internal"
    );
    expect(resolved).toBeNull();
  });
});
