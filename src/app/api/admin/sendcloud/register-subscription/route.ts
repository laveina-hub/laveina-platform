import { NextResponse, type NextRequest } from "next/server";

import { adminLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { verifyAuth } from "@/lib/supabase/auth";
import { logAuditEvent } from "@/services/audit.service";
import { registerEventSubscription } from "@/services/sendcloud.service";
import { registerSendcloudSubscriptionSchema } from "@/validations/admin.schema";

// POST /api/admin/sendcloud/register-subscription
//
// v3-native webhook bootstrap. Ensures a SendCloud Event Subscription exists
// for our `/api/webhooks/sendcloud` URL + the `parcel.status_changed` event.
// Admin-only, rate-limited via `adminLimiter`, idempotent (repeat calls return
// `already_registered`). Returns the per-connection HMAC secret exactly once,
// on first creation — rotating the secret is: delete connection + re-register.

export async function POST(request: NextRequest) {
  const rl = adminLimiter.check(getClientIp(request));
  if (!rl.success) return rateLimitResponse(rl.resetMs);

  const auth = await verifyAuth();
  if (auth.error) return auth.error;
  const { user, role } = auth;
  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = registerSendcloudSubscriptionSchema.safeParse(
    await request.json().catch(() => ({}))
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const webhookUrl = parsed.data.webhookUrl ?? defaultWebhookUrl(request);

  const result = await registerEventSubscription(webhookUrl);
  if (result.error) {
    return NextResponse.json(
      { error: result.error.message },
      { status: result.error.status ?? 502 }
    );
  }

  void logAuditEvent({
    actor_id: user.id,
    action: "sendcloud.subscription_registered",
    resource: "sendcloud_event_subscription",
    metadata: {
      webhook_url: result.data.webhookUrl,
      connection_id: result.data.connectionId,
      connection_created: result.data.connectionCreated,
      subscription_created: result.data.subscriptionCreated,
    },
  });

  return NextResponse.json({
    data: {
      webhook_url: result.data.webhookUrl,
      connection_id: result.data.connectionId,
      connection_created: result.data.connectionCreated,
      subscription_created: result.data.subscriptionCreated,
      connection_secret: result.data.connectionSecret,
      status: result.data.status,
    },
  });
}

function defaultWebhookUrl(request: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  const base = configured && configured.length > 0 ? configured : new URL(request.url).origin;
  return `${base.replace(/\/$/, "")}/api/webhooks/sendcloud`;
}
