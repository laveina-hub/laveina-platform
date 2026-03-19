// ─── SendCloud API client ─────────────────────────────────────────────────────
// Thin HTTP client using Basic Auth (public_key:secret_key).
// All callers go through sendcloud.service.ts — do not import this directly
// outside the service.

import { env } from "@/env";
import type {
  SendcloudParcelCreate,
  SendcloudParcelResponse,
  SendcloudShippingMethodsResponse,
} from "@/types/sendcloud";

const SENDCLOUD_API_BASE = "https://panel.sendcloud.sc/api/v2";

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

async function sendcloudFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${SENDCLOUD_API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: getAuthHeader(),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`SendCloud API error ${res.status}: ${body}`);
  }

  // SAFETY: caller is responsible for passing the correct generic type T
  return res.json() as Promise<T>;
}

// ─── Public API methods ───────────────────────────────────────────────────────

export async function fetchShippingMethods(
  fromCountry = "ES",
  toCountry = "ES"
): Promise<SendcloudShippingMethodsResponse> {
  return sendcloudFetch<SendcloudShippingMethodsResponse>(
    `/shipping_methods?from_country=${fromCountry}&to_country=${toCountry}`
  );
}

export async function createParcel(
  payload: SendcloudParcelCreate
): Promise<SendcloudParcelResponse> {
  return sendcloudFetch<SendcloudParcelResponse>("/parcels", {
    method: "POST",
    body: JSON.stringify({ parcel: payload }),
  });
}
