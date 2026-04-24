import { env } from "@/env";
import { appendSendcloudLog } from "@/lib/sendcloud/log-file";
import type {
  SendcloudV3CancelResponse,
  SendcloudV3CreateConnectionRequest,
  SendcloudV3CreateShipmentRequest,
  SendcloudV3CreateShipmentResponse,
  SendcloudV3CreateSubscriptionRequest,
  SendcloudV3EventSubscription,
  SendcloudV3EventSubscriptionConnection,
  SendcloudV3GetShipmentResponse,
  SendcloudV3ShippingOptionsRequest,
  SendcloudV3ShippingOptionsResponse,
} from "@/types/sendcloud";

// v2 is retired. The Shipments API v3 replaces Parcels + Shipping Methods +
// Shipping Products + Shipping Price endpoints we used in earlier sprints.
// Only v3 endpoints are wired here; callers migrated off v2 in the same PR
// that landed this file.

const SENDCLOUD_API_V3_BASE = "https://panel.sendcloud.sc/api/v3";

function getAuthHeader(): string {
  const pub = env.SENDCLOUD_PUBLIC_KEY;
  const secret = env.SENDCLOUD_SECRET_KEY;

  if (!pub || !secret) {
    throw new Error(
      "SendCloud credentials are not configured (SENDCLOUD_PUBLIC_KEY / SENDCLOUD_SECRET_KEY)"
    );
  }

  const credentials = Buffer.from(`${pub}:${secret}`).toString("base64");
  return `Basic ${credentials}`;
}

/** Pretty-print a JSON value for logs, falling back to String() if unserialisable. */
function formatForLog(value: unknown): string {
  try {
    return typeof value === "string" ? value : JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

async function sendcloudFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const url = `${SENDCLOUD_API_V3_BASE}${path}`;

  // Log outgoing request (method + path + body). Grep `[sendcloud] → ` to
  // trace exactly what we send — weight, dimensions, addresses, options code.
  // Also persisted to `logs/sendcloud-YYYY-MM-DD.log` for later inspection.
  let parsedRequestBody: unknown = null;
  if (options.body) {
    parsedRequestBody = options.body;
    if (typeof options.body === "string") {
      try {
        parsedRequestBody = JSON.parse(options.body);
      } catch {
        parsedRequestBody = options.body;
      }
    }
    console.info(`[sendcloud] → ${method} ${path}`);
    console.info(`[sendcloud]   request body:\n${formatForLog(parsedRequestBody)}`);
  } else {
    console.info(`[sendcloud] → ${method} ${path}  (no body)`);
  }
  void appendSendcloudLog({
    direction: "request",
    method,
    path,
    body: parsedRequestBody,
  });

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: getAuthHeader(),
      ...options.headers,
    },
  });

  const rawBody = await res.text().catch(() => "");

  // Parse the body once for logging, file persistence, and caller return value.
  let parsedBody: unknown = null;
  if (rawBody) {
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      parsedBody = rawBody;
    }
  }

  if (!res.ok) {
    console.warn(`[sendcloud] ← ${res.status} ${method} ${path}`);
    if (rawBody) console.warn(`[sendcloud]   error body:\n${formatForLog(parsedBody)}`);
    void appendSendcloudLog({
      direction: "response",
      method,
      path,
      status: res.status,
      ok: false,
      body: parsedBody,
    });
    throw new Error(`SendCloud API error ${res.status}: ${rawBody}`);
  }

  console.info(`[sendcloud] ← ${res.status} ${method} ${path}`);
  console.info(`[sendcloud]   response body:\n${formatForLog(parsedBody)}`);
  void appendSendcloudLog({
    direction: "response",
    method,
    path,
    status: res.status,
    ok: true,
    body: parsedBody,
  });

  // SAFETY: caller provides correct generic type T; the API response shape is
  // typed at the call site and guarded by v3's documented contract.
  return parsedBody as T;
}

/**
 * POST /api/v3/shipping-options — quote endpoint.
 * Accepts parcel dimensions so each carrier applies its own volumetric rule
 * server-side (Correos /6000, FedEx /5000, InPost, etc.). `calculate_quotes`
 * MUST be `true` to receive pricing; default false per the API spec.
 */
export async function fetchShippingOptions(
  body: SendcloudV3ShippingOptionsRequest
): Promise<SendcloudV3ShippingOptionsResponse> {
  return sendcloudFetch<SendcloudV3ShippingOptionsResponse>("/shipping-options", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * POST /api/v3/shipments — synchronous create + announce. Returns the full
 * shipment incl. tracking number and inline label documents so we don't need
 * a separate label fetch afterwards.
 *
 * Unlike v2, carrier validation errors here surface as `data.errors[]` with
 * an HTTP 200; callers must inspect the response body rather than rely on
 * status codes alone.
 */
export async function createShipmentSync(
  body: SendcloudV3CreateShipmentRequest
): Promise<SendcloudV3CreateShipmentResponse> {
  return sendcloudFetch<SendcloudV3CreateShipmentResponse>("/shipments", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** GET /api/v3/shipments/{shipment_id} — retrieve shipment + parcel status. */
export async function getShipment(shipmentId: string): Promise<SendcloudV3GetShipmentResponse> {
  return sendcloudFetch<SendcloudV3GetShipmentResponse>(
    `/shipments/${encodeURIComponent(shipmentId)}`
  );
}

/**
 * POST /api/v3/shipments/{shipment_id}/cancel — request cancellation before
 * the carrier pickup. v3 may return 200, 202 (queued), or 410 (already
 * deleted) — all non-error states.
 */
export async function cancelShipment(shipmentId: string): Promise<SendcloudV3CancelResponse> {
  const res = await fetch(
    `${SENDCLOUD_API_V3_BASE}/shipments/${encodeURIComponent(shipmentId)}/cancel`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: getAuthHeader(),
      },
    }
  );

  const body = await res.json().catch(() => ({ status: "error", message: "Invalid response" }));

  if (res.status === 200 || res.status === 202 || res.status === 410) {
    return body as SendcloudV3CancelResponse;
  }

  const msg = (body as { message?: string }).message ?? `Cancel failed (${res.status})`;
  throw new Error(msg);
}

// --- v3 Event Subscriptions API — webhook registration/rotation ---
//
// Two resources:
//   - connection (URL + HMAC secret)
//   - subscription (binds a connection to an event type)
//
// Lifecycle expected at runtime: on boot we check if a connection + subscription
// exist for our webhook URL + `parcel.status_changed`. If not, we create them
// (done via the admin register-subscription endpoint). Rotating the secret is
// as simple as deleting + recreating the connection.

type ConnectionListResponse = { data: SendcloudV3EventSubscriptionConnection[] };
type ConnectionResponse = { data: SendcloudV3EventSubscriptionConnection };
type SubscriptionListResponse = { data: SendcloudV3EventSubscription[] };
type SubscriptionResponse = { data: SendcloudV3EventSubscription };

export async function listEventSubscriptionConnections(): Promise<
  SendcloudV3EventSubscriptionConnection[]
> {
  const response = await sendcloudFetch<ConnectionListResponse>("/event-subscriptions/connections");
  return response.data ?? [];
}

export async function createEventSubscriptionConnection(
  body: SendcloudV3CreateConnectionRequest
): Promise<SendcloudV3EventSubscriptionConnection> {
  const response = await sendcloudFetch<ConnectionResponse>("/event-subscriptions/connections", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return response.data;
}

export async function deleteEventSubscriptionConnection(connectionId: string): Promise<void> {
  await sendcloudFetch<void>(
    `/event-subscriptions/connections/${encodeURIComponent(connectionId)}`,
    { method: "DELETE" }
  );
}

export async function listEventSubscriptions(): Promise<SendcloudV3EventSubscription[]> {
  const response = await sendcloudFetch<SubscriptionListResponse>(
    "/event-subscriptions/subscriptions"
  );
  return response.data ?? [];
}

export async function createEventSubscription(
  body: SendcloudV3CreateSubscriptionRequest
): Promise<SendcloudV3EventSubscription> {
  const response = await sendcloudFetch<SubscriptionResponse>(
    "/event-subscriptions/subscriptions",
    { method: "POST", body: JSON.stringify(body) }
  );
  return response.data;
}

export async function deleteEventSubscription(subscriptionId: string): Promise<void> {
  await sendcloudFetch<void>(
    `/event-subscriptions/subscriptions/${encodeURIComponent(subscriptionId)}`,
    { method: "DELETE" }
  );
}

/** Fire a test delivery for a subscription so ops can verify the handler
 *  end-to-end without waiting for a real parcel status change. */
export async function testEventSubscription(subscriptionId: string): Promise<void> {
  await sendcloudFetch<void>(
    `/event-subscriptions/subscriptions/${encodeURIComponent(subscriptionId)}/test`,
    { method: "POST" }
  );
}
