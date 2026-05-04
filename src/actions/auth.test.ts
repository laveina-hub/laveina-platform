// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

// Duplicate-email contract for `registerAction` (client spec 2026-05-04):
// when Supabase signals an existing email (signUp returns a user with
// `identities: []`), we must
// (1) return `{ error: "emailAlreadyExists" }` so the form can render an
//     inline warning under the email field — this is the literal client
//     requirement and replaces the original anti-enumeration silence, and
// (2) still fire `sendDuplicateRegistrationNotice` as defense-in-depth so
//     the real account holder is notified even when the form-side warning
//     is seen by an impersonator rather than the owner.
// These tests lock that contract — don't relax either side without
// re-reading project_register_duplicate_email.md in /memory.

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Map([["x-forwarded-for", "10.0.0.1"]])),
  cookies: vi.fn(async () => ({ get: vi.fn(), set: vi.fn(), delete: vi.fn() })),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("redirect called");
  }),
}));

vi.mock("@/env", () => ({
  env: { NEXT_PUBLIC_APP_URL: "https://laveina.test" },
}));

const mockSignUp = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { signUp: (args: unknown) => mockSignUp(args) },
  })),
}));

const mockSendDuplicateNotice = vi.fn();
vi.mock("@/services/email.service", () => ({
  sendDuplicateRegistrationNotice: (args: unknown) => mockSendDuplicateNotice(args),
}));

const { registerAction } = await import("./auth");

describe("registerAction — anti-enumeration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendDuplicateNotice.mockResolvedValue({ data: { messageId: "stub" }, error: null });
  });

  it("returns success and skips the duplicate notice for a brand-new email", async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: "user-1", identities: [{ id: "id-1" }] } },
      error: null,
    });

    const result = await registerAction("new@example.com", "Sup3rSecret!", "New User", "es");

    expect(result).toEqual({ success: true });
    expect(mockSendDuplicateNotice).not.toHaveBeenCalled();
  });

  it("returns emailAlreadyExists AND fires the notice when the email is already taken", async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: "user-2", identities: [] } },
      error: null,
    });

    const result = await registerAction("taken@example.com", "Sup3rSecret!", "Taken User", "es");

    expect(result).toEqual({ error: "emailAlreadyExists" });
    expect(mockSendDuplicateNotice).toHaveBeenCalledTimes(1);
    expect(mockSendDuplicateNotice).toHaveBeenCalledWith({
      to: "taken@example.com",
      loginUrl: "https://laveina.test/es/auth/login",
      resetPasswordUrl: "https://laveina.test/es/auth/forgot-password",
      locale: "es",
    });
  });

  it("returns generic error when Supabase itself errors (not enumerable)", async () => {
    mockSignUp.mockResolvedValue({
      data: { user: null },
      error: { message: "weak password" },
    });

    const result = await registerAction("any@example.com", "weak", "User", "en");

    expect(result).toEqual({ error: "registrationFailed" });
    expect(mockSendDuplicateNotice).not.toHaveBeenCalled();
  });
});
