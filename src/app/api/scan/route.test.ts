import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/rate-limit", () => ({
  scanLimiter: {
    check: vi.fn(() => ({ success: true, remaining: 29, resetMs: 60000 })),
  },
  getClientIp: vi.fn(() => "127.0.0.1"),
  rateLimitResponse: vi.fn(
    (resetMs: number) =>
      new Response(JSON.stringify({ error: "Too many requests" }), {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(resetMs / 1000)) },
      })
  ),
}));

const mockVerifyAuth = vi.fn();
vi.mock("@/lib/supabase/auth", () => ({
  verifyAuth: (...args: unknown[]) => mockVerifyAuth(...args),
}));

const mockProcessQrScan = vi.fn();
vi.mock("@/services/tracking.service", () => ({
  processQrScan: (...args: unknown[]) => mockProcessQrScan(...args),
}));

const { POST } = await import("./route");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function mockAuthSuccess(role = "pickup_point", userId = "user-1") {
  mockVerifyAuth.mockResolvedValue({
    supabase: {},
    user: { id: userId, email: "test@example.com" },
    role,
  });
}

function mockAuthFailure(status = 401) {
  mockVerifyAuth.mockResolvedValue({
    error: new Response(JSON.stringify({ error: "Unauthorized" }), { status }),
  });
}

async function parseResponse(response: Response) {
  return { status: response.status, body: await response.json() };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/scan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuthFailure();
    const req = createRequest({
      trackingId: "LAV-123",
      pickupPointId: "00000000-0000-0000-0000-000000000001",
    });

    const res = await POST(req);
    const { status } = await parseResponse(res);

    expect(status).toBe(401);
  });

  it("returns 400 for invalid body — missing trackingId", async () => {
    mockAuthSuccess();
    const req = createRequest({ pickupPointId: "00000000-0000-0000-0000-000000000001" });

    const res = await POST(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(400);
    expect(body.error).toBe("Invalid request");
    expect(body.details).toBeDefined();
  });

  it("returns 400 for invalid body — bad UUID", async () => {
    mockAuthSuccess();
    const req = createRequest({ trackingId: "LAV-123", pickupPointId: "not-a-uuid" });

    const res = await POST(req);
    const { status } = await parseResponse(res);

    expect(status).toBe(400);
  });

  it("calls processQrScan with correct arguments on valid input", async () => {
    mockAuthSuccess("pickup_point", "user-42");
    mockProcessQrScan.mockResolvedValue({
      data: { newStatus: "received_at_origin" },
      error: null,
    });

    const req = createRequest({
      trackingId: "LAV-ABCDEF12",
      pickupPointId: "00000000-0000-0000-0000-000000000001",
    });

    const res = await POST(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(200);
    expect(body.data.newStatus).toBe("received_at_origin");
    expect(mockProcessQrScan).toHaveBeenCalledWith("user-42", {
      tracking_id: "LAV-ABCDEF12",
      pickup_point_id: "00000000-0000-0000-0000-000000000001",
    });
  });

  it("returns service error when processQrScan fails", async () => {
    mockAuthSuccess();
    mockProcessQrScan.mockResolvedValue({
      data: null,
      error: { message: "Shipment not found", status: 404 },
    });

    const req = createRequest({
      trackingId: "LAV-NOTFOUND",
      pickupPointId: "00000000-0000-0000-0000-000000000001",
    });

    const res = await POST(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(404);
    expect(body.error).toBe("Shipment not found");
  });

  it("returns 500 when an unexpected error occurs", async () => {
    mockAuthSuccess();
    mockProcessQrScan.mockRejectedValue(new Error("DB connection lost"));

    const req = createRequest({
      trackingId: "LAV-123",
      pickupPointId: "00000000-0000-0000-0000-000000000001",
    });

    const res = await POST(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(500);
    expect(body.error).toBe("DB connection lost");
  });
});
