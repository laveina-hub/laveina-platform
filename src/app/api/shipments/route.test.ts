import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockVerifyAuth = vi.fn();
vi.mock("@/lib/supabase/auth", () => ({
  verifyAuth: (...args: unknown[]) => mockVerifyAuth(...args),
}));

const mockListShipments = vi.fn();
vi.mock("@/services/shipment.service", () => ({
  listShipments: (...args: unknown[]) => mockListShipments(...args),
}));

const { GET } = await import("./route");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/shipments");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url);
}

function mockAuthSuccess(role = "admin", userId = "user-1") {
  mockVerifyAuth.mockResolvedValue({
    supabase: {},
    user: { id: userId, email: "test@example.com" },
    role,
  });
}

function mockAuthFailure() {
  mockVerifyAuth.mockResolvedValue({
    error: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
  });
}

async function parseResponse(response: Response) {
  return { status: response.status, body: await response.json() };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/shipments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuthFailure();

    const res = await GET(createRequest());
    const { status } = await parseResponse(res);

    expect(status).toBe(401);
  });

  it("scopes to user's own shipments for customer role", async () => {
    mockAuthSuccess("customer", "customer-99");
    mockListShipments.mockResolvedValue({
      data: { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 },
      error: null,
    });

    await GET(createRequest());

    expect(mockListShipments).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_id: "customer-99",
      })
    );
  });

  it("allows admin to view all shipments (no customer_id filter)", async () => {
    mockAuthSuccess("admin", "admin-1");
    mockListShipments.mockResolvedValue({
      data: { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 },
      error: null,
    });

    await GET(createRequest());

    expect(mockListShipments).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_id: undefined,
      })
    );
  });

  it("allows admin to filter by specific customer ID", async () => {
    mockAuthSuccess("admin", "admin-1");
    mockListShipments.mockResolvedValue({
      data: { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 },
      error: null,
    });

    await GET(createRequest({ customerId: "00000000-0000-0000-0000-000000000055" }));

    expect(mockListShipments).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_id: "00000000-0000-0000-0000-000000000055",
      })
    );
  });

  it("ignores customerId param for customer role (always uses own ID)", async () => {
    mockAuthSuccess("customer", "customer-99");
    mockListShipments.mockResolvedValue({
      data: { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 },
      error: null,
    });

    await GET(createRequest({ customerId: "00000000-0000-0000-0000-000000000099" }));

    expect(mockListShipments).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_id: "customer-99",
      })
    );
  });

  it("passes pagination params correctly", async () => {
    mockAuthSuccess("admin");
    mockListShipments.mockResolvedValue({
      data: { data: [], total: 0, page: 3, pageSize: 10, totalPages: 5 },
      error: null,
    });

    await GET(createRequest({ page: "3", pageSize: "10" }));

    expect(mockListShipments).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 3,
        pageSize: 10,
      })
    );
  });

  it("passes status filter correctly", async () => {
    mockAuthSuccess("admin");
    mockListShipments.mockResolvedValue({
      data: { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 },
      error: null,
    });

    await GET(createRequest({ status: "in_transit" }));

    expect(mockListShipments).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "in_transit",
      })
    );
  });

  it("returns 400 for invalid query params", async () => {
    mockAuthSuccess("admin");

    const res = await GET(createRequest({ page: "-1" }));
    const { status, body } = await parseResponse(res);

    expect(status).toBe(400);
    expect(body.error).toBe("Invalid query parameters");
  });

  it("returns service error when listShipments fails", async () => {
    mockAuthSuccess("admin");
    mockListShipments.mockResolvedValue({
      data: null,
      error: { message: "Database error", status: 500 },
    });

    const res = await GET(createRequest());
    const { status, body } = await parseResponse(res);

    expect(status).toBe(500);
    expect(body.error).toBe("Database error");
  });
});
