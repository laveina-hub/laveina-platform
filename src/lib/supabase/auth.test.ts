import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockSingle = vi.fn();
// SAFETY: Supabase query builder chain requires recursive typing — using `any` for test mocks only
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockEq: any = vi.fn(() => ({ single: mockSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));
const mockGetUser = vi.fn();

vi.mock("./server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    })
  ),
}));

// Import after mocks are set up
const { verifyAuth } = await import("./auth");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockAuthenticatedUser(id = "user-1") {
  mockGetUser.mockResolvedValue({
    data: { user: { id, email: "test@example.com" } },
    error: null,
  });
}

function mockProfile(role: string) {
  mockSingle.mockResolvedValue({ data: { role }, error: null });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("verifyAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: chained query builder returns single()
    mockEq.mockReturnValue({ eq: mockEq, single: mockSingle });
  });

  it("returns 401 when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const result = await verifyAuth();

    expect(result.error).toBeInstanceOf(NextResponse);
    expect(result.error?.status).toBe(401);
  });

  it("returns 403 when profile is not found", async () => {
    mockAuthenticatedUser();
    mockSingle.mockResolvedValue({ data: null, error: null });

    const result = await verifyAuth();

    expect(result.error).toBeInstanceOf(NextResponse);
    expect(result.error?.status).toBe(403);
  });

  it("returns user and role on success", async () => {
    mockAuthenticatedUser("user-123");
    mockProfile("admin");

    const result = await verifyAuth();

    expect(result.error).toBeUndefined();
    expect(result.user?.id).toBe("user-123");
    expect(result.role).toBe("admin");
    expect(result.supabase).toBeDefined();
  });

  it("queries profiles table with correct user ID", async () => {
    mockAuthenticatedUser("user-456");
    mockProfile("customer");

    await verifyAuth();

    expect(mockFrom).toHaveBeenCalledWith("profiles");
    expect(mockSelect).toHaveBeenCalledWith("role");
    expect(mockEq).toHaveBeenCalledWith("id", "user-456");
  });

  it("returns correct role for pickup_point users", async () => {
    mockAuthenticatedUser();
    mockProfile("pickup_point");

    const result = await verifyAuth();

    expect(result.role).toBe("pickup_point");
  });
});
