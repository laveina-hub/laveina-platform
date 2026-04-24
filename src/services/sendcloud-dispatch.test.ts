import { beforeEach, describe, expect, it, vi } from "vitest";

// Stub infra imports the service pulls in through `env` + supabase admin so
// the pure dispatch logic runs in isolation. `env.SENDCLOUD_PUBLIC_KEY` gets
// set to a truthy value below so the real (mocked) v3 client branch runs
// instead of the mock-data fallback.

vi.mock("@/env", () => ({
  env: {
    SENDCLOUD_PUBLIC_KEY: "test-public",
    SENDCLOUD_SECRET_KEY: "test-secret",
  },
}));

const mockCreateShipmentSync = vi.fn();
const mockCancelShipment = vi.fn();
const mockGetShipment = vi.fn();
const mockFetchShippingOptions = vi.fn();

vi.mock("@/lib/sendcloud/client", () => ({
  createShipmentSync: (...args: unknown[]) => mockCreateShipmentSync(...args),
  cancelShipment: (...args: unknown[]) => mockCancelShipment(...args),
  getShipment: (...args: unknown[]) => mockGetShipment(...args),
  fetchShippingOptions: (...args: unknown[]) => mockFetchShippingOptions(...args),
}));

const { dispatchParcel, dispatchShipmentBundle, cancelSendcloudParcel, getSendcloudParcelStatus } =
  await import("./sendcloud.service");

const DISPATCH_ARGS = {
  shippingOptionCode: "correos:standard",
  receiverName: "John Doe",
  receiverPhone: "+34612345678",
  destinationAddress: "Calle Atocha 45",
  destinationCity: "Madrid",
  destinationPostcode: "28012",
  weightKg: 3,
  lengthCm: 35,
  widthCm: 35,
  heightCm: 24,
  trackingId: "LAV-1234-5678",
  senderName: "Laveina HQ",
  senderPhone: "+34934652923",
  senderAddress: "Rambla de l'Exposició 103",
  senderCity: "Vilanova i la Geltrú",
  senderPostcode: "08800",
};

describe("dispatchParcel (v3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds a v3 request with shipping_option_code + real dimensions", async () => {
    mockCreateShipmentSync.mockResolvedValue({
      data: {
        id: "ship_abc123",
        parcels: [
          {
            id: 999001,
            status: { code: "ANNOUNCED", message: "Announced" },
            tracking_number: "3SYZXG5051720",
            tracking_url: "https://track.example/3SYZXG5051720",
            documents: [{ type: "label", size: "a6", link: "https://labels.example/abc.pdf" }],
          },
        ],
        from_address: {} as never,
        to_address: {} as never,
        ship_with: {
          type: "shipping_option_code",
          properties: { shipping_option_code: "correos:standard" },
        },
        carrier: { code: "correos", name: "Correos" },
      },
    });

    const result = await dispatchParcel(DISPATCH_ARGS);

    expect(result.error).toBeNull();
    expect(result.data).toEqual({
      sendcloudShipmentId: "ship_abc123",
      sendcloudParcelId: 999001,
      carrierCode: "correos",
      carrierName: "Correos",
      trackingNumber: "3SYZXG5051720",
      trackingUrl: "https://track.example/3SYZXG5051720",
      labelUrl: "https://labels.example/abc.pdf",
      statusCode: "ANNOUNCED",
      statusMessage: "Announced",
    });

    const [sent] = mockCreateShipmentSync.mock.calls[0];
    expect(sent.ship_with).toEqual({
      type: "shipping_option_code",
      properties: { shipping_option_code: "correos:standard" },
    });
    expect(sent.parcels[0].weight).toEqual({ value: "3.000", unit: "kg" });
    expect(sent.parcels[0].dimensions).toEqual({
      length: "35",
      width: "35",
      height: "24",
      unit: "cm",
    });
    expect(sent.to_address.country_code).toBe("ES");
    expect(sent.from_address.country_code).toBe("ES");
  });

  it("demotes carrier validation errors (v3 200 with errors[]) to ApiError", async () => {
    mockCreateShipmentSync.mockResolvedValue({
      data: {
        id: "ship_abc123",
        parcels: [],
        errors: [{ detail: "Invalid postal code", code: "validation_error" }],
        from_address: {} as never,
        to_address: {} as never,
        ship_with: {
          type: "shipping_option_code",
          properties: { shipping_option_code: "correos:standard" },
        },
      },
    });

    const result = await dispatchParcel(DISPATCH_ARGS);

    expect(result.data).toBeNull();
    expect(result.error?.status).toBe(502);
    expect(result.error?.message).toBe("Invalid postal code");
    expect(result.error?.code).toBe("validation_error");
  });

  it("handles network failures gracefully", async () => {
    mockCreateShipmentSync.mockRejectedValue(new Error("timeout"));

    const result = await dispatchParcel(DISPATCH_ARGS);

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe("timeout");
    expect(result.error?.status).toBe(502);
  });

  it("fails closed when v3 returns a shipment without parcels", async () => {
    mockCreateShipmentSync.mockResolvedValue({
      data: {
        id: "ship_abc",
        parcels: [],
        from_address: {} as never,
        to_address: {} as never,
        ship_with: {
          type: "shipping_option_code",
          properties: { shipping_option_code: "correos:standard" },
        },
      },
    });

    const result = await dispatchParcel(DISPATCH_ARGS);

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe("sendcloud.noParcelInResponse");
  });
});

describe("dispatchShipmentBundle — multi-parcel", () => {
  beforeEach(() => vi.clearAllMocks());

  const BUNDLE_ARGS = {
    shippingOptionCode: "correos:standard",
    receiverName: "John Doe",
    receiverPhone: "+34612345678",
    destinationAddress: "Calle Atocha 45",
    destinationCity: "Madrid",
    destinationPostcode: "28012",
    senderName: "Laveina HQ",
    senderPhone: "+34934652923",
    senderAddress: "Rambla de l'Exposició 103",
    senderCity: "Vilanova i la Geltrú",
    senderPostcode: "08800",
    parcels: [
      { trackingId: "LAV-1111", weightKg: 3, lengthCm: 35, widthCm: 35, heightCm: 24 },
      { trackingId: "LAV-2222", weightKg: 5, lengthCm: 40, widthCm: 40, heightCm: 37 },
      { trackingId: "LAV-3333", weightKg: 2, lengthCm: 30, widthCm: 20, heightCm: 20 },
    ],
    orderReference: "cs_test_bundle123",
  };

  it("sends ONE /shipments call with all parcels and returns per-parcel results sharing shipment_id", async () => {
    mockCreateShipmentSync.mockResolvedValue({
      data: {
        id: "ship_bundle",
        parcels: [
          {
            id: 111,
            status: { code: "ANNOUNCED", message: "Announced" },
            tracking_number: "T1",
            tracking_url: "https://t/1",
            documents: [{ type: "label", size: "a6", link: "https://l/1.pdf" }],
          },
          {
            id: 222,
            status: { code: "ANNOUNCED", message: "Announced" },
            tracking_number: "T2",
            tracking_url: "https://t/2",
            documents: [{ type: "label", size: "a6", link: "https://l/2.pdf" }],
          },
          {
            id: 333,
            status: { code: "ANNOUNCED", message: "Announced" },
            tracking_number: "T3",
            tracking_url: "https://t/3",
            documents: [{ type: "label", size: "a6", link: "https://l/3.pdf" }],
          },
        ],
        from_address: {} as never,
        to_address: {} as never,
        ship_with: {
          type: "shipping_option_code",
          properties: { shipping_option_code: "correos:standard" },
        },
        carrier: { code: "correos", name: "Correos" },
      },
    });

    const result = await dispatchShipmentBundle(BUNDLE_ARGS);

    expect(mockCreateShipmentSync).toHaveBeenCalledTimes(1);
    expect(result.error).toBeNull();
    expect(result.data?.sendcloudShipmentId).toBe("ship_bundle");
    expect(result.data?.parcels).toHaveLength(3);
    // Every parcel shares the same SendCloud shipment id — that's the whole
    // point of bundling: one waybill, N parcel ids.
    for (const p of result.data!.parcels) {
      expect(p.sendcloudShipmentId).toBe("ship_bundle");
    }
    expect(result.data?.parcels.map((p) => p.sendcloudParcelId)).toEqual([111, 222, 333]);
    expect(result.data?.parcels.map((p) => p.trackingNumber)).toEqual(["T1", "T2", "T3"]);

    const [sent] = mockCreateShipmentSync.mock.calls[0];
    expect(sent.parcels).toHaveLength(3);
    expect(sent.parcels[0].order_number).toBe("LAV-1111");
    expect(sent.parcels[1].order_number).toBe("LAV-2222");
    expect(sent.parcels[2].order_number).toBe("LAV-3333");
    expect(sent.external_reference_id).toBe("cs_test_bundle123");
  });

  it("demotes the whole bundle to error if v3 returns errors[]", async () => {
    mockCreateShipmentSync.mockResolvedValue({
      data: {
        id: "ship_bundle",
        parcels: [],
        errors: [{ detail: "Address rejected", code: "validation_error" }],
        from_address: {} as never,
        to_address: {} as never,
        ship_with: {
          type: "shipping_option_code",
          properties: { shipping_option_code: "correos:standard" },
        },
      },
    });

    const result = await dispatchShipmentBundle(BUNDLE_ARGS);
    expect(result.data).toBeNull();
    expect(result.error?.message).toBe("Address rejected");
  });

  it("rejects empty parcels array before hitting the API", async () => {
    const result = await dispatchShipmentBundle({ ...BUNDLE_ARGS, parcels: [] });
    expect(mockCreateShipmentSync).not.toHaveBeenCalled();
    expect(result.error?.message).toBe("sendcloud.noParcelsToDispatch");
  });
});

describe("cancelSendcloudParcel (v3)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("accepts a string shipment id and normalises the response shape", async () => {
    mockCancelShipment.mockResolvedValue({
      data: { status: "queued", message: "Cancellation queued" },
    });

    const result = await cancelSendcloudParcel("ship_abc123");

    expect(mockCancelShipment).toHaveBeenCalledWith("ship_abc123");
    expect(result.data).toEqual({
      status: "queued",
      message: "Cancellation queued",
    });
  });

  it("handles the flat response shape used by some carriers", async () => {
    mockCancelShipment.mockResolvedValue({
      status: "cancelled",
      message: "Cancelled",
    });

    const result = await cancelSendcloudParcel("ship_xyz");
    expect(result.data?.status).toBe("cancelled");
  });

  it("returns 400 ApiError when the cancel call rejects", async () => {
    mockCancelShipment.mockRejectedValue(new Error("Cancel failed (410)"));

    const result = await cancelSendcloudParcel("ship_gone");

    expect(result.data).toBeNull();
    expect(result.error?.status).toBe(400);
  });
});

describe("getSendcloudParcelStatus (v3)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the string status code from the first parcel in the shipment", async () => {
    mockGetShipment.mockResolvedValue({
      data: {
        id: "ship_abc123",
        parcels: [
          {
            id: 999001,
            status: { code: "IN_TRANSIT", message: "En route" },
            tracking_number: "3SYZXG",
            tracking_url: "https://track/abc",
            documents: [{ type: "label", size: "a6", link: "https://labels/abc.pdf" }],
          },
        ],
        from_address: {} as never,
        to_address: {} as never,
        ship_with: {
          type: "shipping_option_code",
          properties: { shipping_option_code: "correos:standard" },
        },
      },
    });

    const result = await getSendcloudParcelStatus("ship_abc123");

    expect(result.data).toEqual({
      statusCode: "IN_TRANSIT",
      statusMessage: "En route",
      trackingNumber: "3SYZXG",
      trackingUrl: "https://track/abc",
      labelUrl: "https://labels/abc.pdf",
    });
  });

  it("fails closed when the shipment has no parcels", async () => {
    mockGetShipment.mockResolvedValue({
      data: {
        id: "ship_empty",
        parcels: [],
        from_address: {} as never,
        to_address: {} as never,
        ship_with: {
          type: "shipping_option_code",
          properties: { shipping_option_code: "correos:standard" },
        },
      },
    });

    const result = await getSendcloudParcelStatus("ship_empty");
    expect(result.error?.message).toBe("sendcloud.noParcelInResponse");
  });
});
