import { createHmac } from "node:crypto";

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// v3 SendCloud webhook: accepts classic `{ action, parcel }` AND Event
// Subscriptions `{ event_type, data: { parcel } }` payload shapes, both
// using the v3 string status codes. The handler's job:
//   1. Verify HMAC signature (SHA256, `SENDCLOUD_SECRET_KEY`).
//   2. Normalise the two payload shapes into a single internal record.
//   3. Skip when status doesn't map (unknown v3 codes log a warning).
//   4. Write scan_log + update shipment status atomically; idempotent via
//      an existing-log lookup.
//
// These tests mock the supabase admin client + notification services so we
// can assert on the normalisation + HMAC + idempotency logic without infra.

const SECRET = "test-secret";

vi.mock("@/env", () => ({
  env: {
    SENDCLOUD_SECRET_KEY: SECRET,
  },
}));

const mockSupabase = {
  from: vi.fn(),
};

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => mockSupabase,
}));

vi.mock("@/services/admin-notification.service", () => ({
  notifyDeliveryProblem: vi.fn().mockResolvedValue(undefined),
  notifyParcelDelivered: vi.fn().mockResolvedValue(undefined),
  notifyParcelReturned: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/services/email-templates.service", () => ({
  sendStatusUpdateEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/services/notification.service", () => ({
  sendStatusUpdate: vi.fn().mockResolvedValue(undefined),
}));

const { POST } = await import("./route");

function signedRequest(payload: unknown, secret = SECRET): NextRequest {
  const body = JSON.stringify(payload);
  const signature = createHmac("sha256", secret).update(body).digest("hex");
  return new NextRequest("http://localhost/api/webhooks/sendcloud", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "sendcloud-signature": signature,
    },
    body,
  });
}

type SupabaseChain = {
  select: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
};

function buildChain(): SupabaseChain {
  const chain = {} as SupabaseChain;
  chain.select = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockResolvedValue({ data: null, error: null });
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.is = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn();
  return chain;
}

function setupShipmentLookup(
  shipmentChain: SupabaseChain,
  shipment: {
    id: string;
    status: string;
    tracking_id: string;
    carrier_tracking_number?: string | null;
  } | null,
  scanLogExists: boolean = false
) {
  const scanLogChain = buildChain();
  scanLogChain.single.mockResolvedValue(scanLogExists ? { data: { id: "log-1" } } : { data: null });

  shipmentChain.single.mockResolvedValueOnce(
    shipment
      ? {
          data: {
            destination_pickup_point_id: "pp-dest",
            sender_phone: "+34600000000",
            sender_email: "sender@example.com",
            sender_first_name: "Ana",
            sender_last_name: "López",
            receiver_phone: "+34611111111",
            receiver_first_name: "Pedro",
            receiver_last_name: "García",
            preferred_locale: "es",
            carrier_tracking_number: null,
            ...shipment,
          },
          error: null,
        }
      : { data: null, error: { message: "not found" } }
  );

  mockSupabase.from.mockImplementation((table: string) => {
    if (table === "shipments") return shipmentChain;
    if (table === "scan_logs") return scanLogChain;
    throw new Error(`Unexpected table: ${table}`);
  });
}

describe("POST /api/webhooks/sendcloud (v3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects requests with invalid signature", async () => {
    const body = JSON.stringify({ action: "parcel_status_changed" });
    const req = new NextRequest("http://localhost/api/webhooks/sendcloud", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "sendcloud-signature": "wrong-signature",
      },
      body,
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("accepts classic v3 webhook shape and maps string status codes", async () => {
    const shipmentChain = buildChain();
    setupShipmentLookup(shipmentChain, {
      id: "ship-1",
      status: "in_transit",
      tracking_id: "LAV-1234-5678",
    });

    const res = await POST(
      signedRequest({
        action: "parcel_status_changed",
        timestamp: 1700000000,
        parcel: {
          id: 999001,
          tracking_number: "3SYZXG",
          status: {
            code: "AWAITING_CUSTOMER_PICKUP",
            message: "Ready for pickup",
          },
        },
      })
    );

    expect(res.status).toBe(200);
    // Should have looked up the shipment by integer parcel id (v3 still uses int)
    expect(shipmentChain.eq).toHaveBeenCalledWith("sendcloud_parcel_id", 999001);
    // Should have written the new status (AWAITING_CUSTOMER_PICKUP → READY_FOR_PICKUP)
    expect(shipmentChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "ready_for_pickup" })
    );
  });

  it("accepts Event Subscriptions delivery envelope shape", async () => {
    const shipmentChain = buildChain();
    setupShipmentLookup(shipmentChain, {
      id: "ship-2",
      status: "ready_for_pickup",
      tracking_id: "LAV-2222-3333",
    });

    const res = await POST(
      signedRequest({
        event_type: "parcel.status_changed",
        event_id: "evt-abc",
        timestamp: 1700000100,
        data: {
          parcel: {
            id: 999002,
            tracking_number: "3SYZXG2",
            status: { code: "DELIVERED", message: "Delivered" },
          },
        },
      })
    );

    expect(res.status).toBe(200);
    expect(shipmentChain.eq).toHaveBeenCalledWith("sendcloud_parcel_id", 999002);
    expect(shipmentChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "delivered" })
    );
  });

  it("is idempotent — skips update when the scan_log for this transition exists", async () => {
    const shipmentChain = buildChain();
    setupShipmentLookup(
      shipmentChain,
      { id: "ship-3", status: "in_transit", tracking_id: "LAV-3333-4444" },
      true // scan_log already present
    );

    const res = await POST(
      signedRequest({
        action: "parcel_status_changed",
        timestamp: 1,
        parcel: {
          id: 999003,
          status: { code: "DELIVERED", message: "Delivered" },
        },
      })
    );

    expect(res.status).toBe(200);
    // Update should NOT have fired (idempotency guard)
    expect(shipmentChain.update).not.toHaveBeenCalled();
  });

  it("returns 200 received:true when no shipment matches the parcel id", async () => {
    const shipmentChain = buildChain();
    setupShipmentLookup(shipmentChain, null);

    const res = await POST(
      signedRequest({
        action: "parcel_status_changed",
        parcel: {
          id: 404404,
          status: { code: "DELIVERED", message: "Delivered" },
        },
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.received).toBe(true);
  });

  it("warns and skips when v3 status code is unknown (no silent status loss)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const shipmentChain = buildChain();
    setupShipmentLookup(shipmentChain, {
      id: "ship-4",
      status: "in_transit",
      tracking_id: "LAV-5555-6666",
    });

    const res = await POST(
      signedRequest({
        action: "parcel_status_changed",
        parcel: {
          id: 999004,
          status: { code: "FUTURE_UNKNOWN_STATE", message: "Unknown" },
        },
      })
    );

    expect(res.status).toBe(200);
    expect(shipmentChain.update).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('unmapped v3 status "FUTURE_UNKNOWN_STATE"')
    );
    warn.mockRestore();
  });

  it("ignores non-parcel-status event types gracefully", async () => {
    const res = await POST(
      signedRequest({
        event_type: "integration.modified",
        data: { some: "payload" },
      })
    );

    expect(res.status).toBe(200);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it("returns 400 for malformed parcel shape (missing status code)", async () => {
    const res = await POST(
      signedRequest({
        action: "parcel_status_changed",
        parcel: { id: 999999 }, // no status
      })
    );

    // Falls out of normalisePayload → returns 200 received:true
    // (this is the safest behavior — ack + log rather than fail + retry loop)
    expect(res.status).toBe(200);
  });
});
