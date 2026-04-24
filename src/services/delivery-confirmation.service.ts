import { createHash, randomBytes } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiResponse } from "@/types/api";

// Q13.2 — delivery-confirm tokens gate the public
// /delivery-confirm/[trackingId]/[token] page. The raw token travels in the
// email link; only SHA-256 hash persists in the DB (same pattern as
// otp_receiver_tokens). Valid for 7 days; reusable within that window so the
// receiver can come back to edit their rating (rating edit window is also
// 7 days — aligned intentionally).

const TOKEN_EXPIRY_DAYS = 7;
const ONE_DAY_MS = 86_400_000;

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * Issues a fresh delivery-confirmation token. The raw token is returned ONCE
 * so the caller can embed it in the WhatsApp/email link; only the hash is
 * persisted. Safe to call multiple times for the same shipment — each call
 * produces a new token row, and any prior token remains valid until its own
 * `expires_at`.
 */
export async function issueDeliveryConfirmationToken(
  shipmentId: string
): Promise<ApiResponse<{ token: string; expires_at: string }>> {
  const raw = randomBytes(32).toString("hex");
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_DAYS * ONE_DAY_MS).toISOString();

  const supabase = createAdminClient();
  const { error } = await supabase.from("delivery_confirmation_tokens").insert({
    shipment_id: shipmentId,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });

  if (error) {
    return { data: null, error: { message: error.message, status: 500 } };
  }

  return { data: { token: raw, expires_at: expiresAt }, error: null };
}

/**
 * Builds the public URL a receiver clicks to rate their delivery. Uses
 * NEXT_PUBLIC_APP_URL when available; falls back to a relative path so emails
 * still render something clickable in dev without the env var set.
 */
export function buildDeliveryConfirmationUrl(
  trackingId: string,
  token: string,
  appUrl: string | null | undefined
): string {
  const base = appUrl ?? "";
  const path = `/delivery-confirm/${trackingId}/${token}`;
  return base ? `${base}${path}` : path;
}
