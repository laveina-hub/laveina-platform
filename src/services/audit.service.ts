import { createAdminClient } from "@/lib/supabase/admin";

type AuditLogEntry = {
  actor_id?: string | null;
  action: string;
  resource: string;
  resource_id?: string | null;
  metadata?: Record<string, unknown>;
  ip_address?: string | null;
};

/**
 * Writes an audit log entry for sensitive operations.
 *
 * Uses the admin client (bypasses RLS) so it works in both
 * authenticated routes and webhook handlers.
 *
 * Best-effort: failures are logged but never thrown — audit logging
 * must not break the primary operation.
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    const supabase = createAdminClient();

    const { error } = await supabase.from("audit_logs").insert({
      actor_id: entry.actor_id ?? null,
      action: entry.action,
      resource: entry.resource,
      resource_id: entry.resource_id ?? null,
      metadata: entry.metadata ?? {},
      ip_address: entry.ip_address ?? null,
    });

    if (error) {
      console.error("Audit log write failed:", error.message);
    }
  } catch (err) {
    console.error("Audit log write failed:", err);
  }
}
