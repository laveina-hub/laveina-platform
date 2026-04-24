import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_PARCEL_PRESETS } from "@/constants/parcel-preset-defaults";
import type { PriceOption } from "@/types/shipment";

// Auth-free endpoint — quotes are public. We mock the pricing service and
// preset loader so the route only exercises request parsing, route resolution,
// aggregation, and error mapping.

const mockListActivePresets = vi.fn();
vi.mock("@/services/parcel-preset.service", () => ({
  listActivePresets: (...args: unknown[]) => mockListActivePresets(...args),
}));

const mockQuoteShipmentPrices = vi.fn();
const mockResolveParcelForPricing = vi.fn();
vi.mock("@/services/pricing.service", () => ({
  quoteShipmentPrices: (...args: unknown[]) => mockQuoteShipmentPrices(...args),
  resolveParcelForPricing: (...args: unknown[]) => mockResolveParcelForPricing(...args),
}));

const { POST } = await import("./route");

function request(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/shipments/quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Build a realistic PriceOption following the Q15.2 formula:
//   subtotalCents = shippingCents + insuranceSurchargeCents   (both ex-VAT)
//   ivaCents      = round(subtotalCents × 0.21)
//   totalCents    = subtotalCents + ivaCents
// Overriding `shippingCents` or `insuranceSurchargeCents` recomputes the
// derived fields automatically; pass explicit `subtotalCents`/`totalCents`
// to override.
function option(overrides: Partial<PriceOption> = {}): PriceOption {
  const shippingCents = overrides.shippingCents ?? 400;
  const insuranceSurchargeCents = overrides.insuranceSurchargeCents ?? 0;
  const subtotalCents = overrides.subtotalCents ?? shippingCents + insuranceSurchargeCents;
  const ivaCents = overrides.ivaCents ?? Math.round(subtotalCents * 0.21);
  const totalCents = overrides.totalCents ?? subtotalCents + ivaCents;
  return {
    shippingCents,
    carrierRateCents: 320,
    marginPercent: 25,
    insuranceSurchargeCents,
    subtotalCents,
    ivaCents,
    totalCents,
    shippingMethodId: null,
    shippingOptionCode: null,
    estimatedDays: "2-3",
    ...overrides,
  };
}

const BCN_BODY = {
  origin_postcode: "08001",
  destination_postcode: "08003",
  parcels: [{ preset_slug: "small", weight_kg: 3, wants_insurance: false }],
};

const NON_BCN_BODY = {
  origin_postcode: "08001",
  destination_postcode: "28001",
  parcels: [{ preset_slug: "small", weight_kg: 3, wants_insurance: false }],
};

describe("POST /api/shipments/quote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListActivePresets.mockResolvedValue({
      data: DEFAULT_PARCEL_PRESETS,
      error: null,
    });
    mockResolveParcelForPricing.mockReturnValue({
      presetSlug: "small",
      billableWeightKg: 3,
    });
  });

  it("returns 400 for invalid body", async () => {
    const res = await POST(request({ origin_postcode: "bad" }));
    expect(res.status).toBe(400);
  });

  it("returns 422 for blocked route (invalid postcode)", async () => {
    const res = await POST(
      request({
        origin_postcode: "12345",
        destination_postcode: "abcde", // fails regex → 400 from schema before routing
        parcels: [{ preset_slug: "small", weight_kg: 3, wants_insurance: false }],
      })
    );
    expect(res.status).toBe(400);
  });

  // Helper to build the new bundled-quote response shape. Pass one options
  // block and an optional `count` to repeat it N times for multi-parcel tests.
  type OptionsBlock = {
    standard: PriceOption | null;
    express: PriceOption | null;
    next_day: PriceOption | null;
  };
  function bundleResponse(deliveryMode: "internal" | "sendcloud", optionsList: OptionsBlock[]) {
    return {
      data: {
        deliveryMode,
        parcels: optionsList.map((options) => ({
          presetSlug: "small",
          actualWeightKg: 3,
          options,
        })),
        insuranceCoverageCents: 2500,
      },
      error: null,
    };
  }

  it("returns BCN quote with all three speed options for 08xxx→08xxx", async () => {
    // Matrix values (ex-VAT): 495/790/990c for Small. totalCents after Q15.2:
    //   495 + round(495 × 0.21) = 495 + 104 = 599
    //   790 + round(790 × 0.21) = 790 + 166 = 956
    //   990 + round(990 × 0.21) = 990 + 208 = 1198
    mockQuoteShipmentPrices.mockResolvedValue(
      bundleResponse("internal", [
        {
          standard: option({ shippingCents: 495 }),
          express: option({ shippingCents: 790 }),
          next_day: option({ shippingCents: 990 }),
        },
      ])
    );

    const res = await POST(request(BCN_BODY));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.delivery_mode).toBe("internal");
    expect(body.data.totals.standard).toBe(599);
    expect(body.data.totals.next_day).toBe(1198);
  });

  it("returns SendCloud quote with next_day null for non-BCN routes", async () => {
    // ex-VAT shipping 400/650 → totals 484/787 (400 + 84, 650 + 137).
    mockQuoteShipmentPrices.mockResolvedValue(
      bundleResponse("sendcloud", [
        {
          standard: option({ shippingCents: 400 }),
          express: option({ shippingCents: 650 }),
          next_day: null,
        },
      ])
    );

    const res = await POST(request(NON_BCN_BODY));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.delivery_mode).toBe("sendcloud");
    expect(body.data.totals.standard).toBe(484);
    expect(body.data.totals.express).toBe(787);
    expect(body.data.totals.next_day).toBeNull();
  });

  it("sums multi-parcel totals correctly", async () => {
    // Bundled quote returns one PriceOption per parcel — for a 2-parcel BCN
    // cart, the service returns two parcel entries with the same matrix values.
    mockResolveParcelForPricing.mockReturnValue({
      presetSlug: "small",
      billableWeightKg: 3,
    });
    const parcelOptions: OptionsBlock = {
      standard: option({ shippingCents: 495 }),
      express: option({ shippingCents: 790 }),
      next_day: option({ shippingCents: 990 }),
    };
    mockQuoteShipmentPrices.mockResolvedValue(
      bundleResponse("internal", [parcelOptions, parcelOptions])
    );

    const res = await POST(
      request({
        origin_postcode: "08001",
        destination_postcode: "08003",
        parcels: [
          { preset_slug: "small", weight_kg: 3, wants_insurance: false },
          { preset_slug: "small", weight_kg: 3, wants_insurance: false },
        ],
      })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.parcels).toHaveLength(2);
    expect(body.data.totals.standard).toBe(599 * 2);
    expect(body.data.totals.next_day).toBe(1198 * 2);
  });

  it("returns 503 when SendCloud is unreachable", async () => {
    mockQuoteShipmentPrices.mockResolvedValue({
      data: null,
      error: { message: "pricing.sendcloudUnavailable", status: 503 },
    });

    const res = await POST(request(NON_BCN_BODY));
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.error).toBe("pricing.sendcloudUnavailable");
  });

  it("returns 422 when a parcel cannot be resolved (weight > 20kg)", async () => {
    mockResolveParcelForPricing.mockReturnValue(null);

    const res = await POST(request(BCN_BODY));
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.error).toBe("parcel.unresolvable");
  });

  it("returns 503 when parcel presets aren't configured", async () => {
    mockListActivePresets.mockResolvedValue({
      data: null,
      error: { message: "db_error", status: 500 },
    });

    const res = await POST(request(BCN_BODY));
    expect(res.status).toBe(503);
  });

  it("applies insurance surcharge from declared_value_cents", async () => {
    // shippingCents 495 + insurance 250 = 745 subtotal ex-VAT
    //   VAT = round(745 × 0.21) = round(156.45) = 156
    //   total = 745 + 156 = 901
    mockQuoteShipmentPrices.mockResolvedValue(
      bundleResponse("internal", [
        {
          standard: option({ shippingCents: 495, insuranceSurchargeCents: 250 }),
          express: null,
          next_day: null,
        },
      ])
    );

    await POST(
      request({
        origin_postcode: "08001",
        destination_postcode: "08003",
        parcels: [
          {
            preset_slug: "small",
            weight_kg: 3,
            declared_value_cents: 7500, // €75 → tier upTo100 → 250c insurance
            wants_insurance: true,
          },
        ],
      })
    );

    // The route now sends all parcels to `quoteShipmentPrices` in one call;
    // verify insurance surcharge lives on the corresponding parcel entry.
    const call = mockQuoteShipmentPrices.mock.calls[0][0];
    expect(call.parcels).toHaveLength(1);
    expect(call.parcels[0].insuranceSurchargeCents).toBe(250);
  });
});
