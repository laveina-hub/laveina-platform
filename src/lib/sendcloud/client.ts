import { env } from "@/env";
import type {
  SendcloudParcelCreate,
  SendcloudParcelResponse,
  SendcloudShippingMethodsResponse,
  SendcloudShippingPrice,
  SendcloudShippingProduct,
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

  // SAFETY: caller provides correct generic type T
  return res.json() as Promise<T>;
}

export async function fetchShippingMethods(
  fromCountry = "ES",
  toCountry = "ES"
): Promise<SendcloudShippingMethodsResponse> {
  return sendcloudFetch<SendcloudShippingMethodsResponse>(
    `/shipping_methods?from_country=${fromCountry}&to_country=${toCountry}`
  );
}

export async function fetchShippingProducts(
  fromCountry = "ES",
  toCountry = "ES"
): Promise<SendcloudShippingProduct[]> {
  return sendcloudFetch<SendcloudShippingProduct[]>(
    `/shipping-products?from_country=${fromCountry}&to_country=${toCountry}`
  );
}

export async function fetchShippingPrice(params: {
  shippingMethodId: number;
  fromPostalCode: string;
  toPostalCode: string;
  weightKg: number;
}): Promise<SendcloudShippingPrice[]> {
  const qs = new URLSearchParams({
    shipping_method_id: String(params.shippingMethodId),
    from_country: "ES",
    to_country: "ES",
    from_postal_code: params.fromPostalCode,
    to_postal_code: params.toPostalCode,
    weight: String(params.weightKg),
    weight_unit: "kilogram",
  });
  return sendcloudFetch<SendcloudShippingPrice[]>(`/shipping-price?${qs.toString()}`);
}

export async function createParcel(
  payload: SendcloudParcelCreate
): Promise<SendcloudParcelResponse> {
  return sendcloudFetch<SendcloudParcelResponse>("/parcels", {
    method: "POST",
    body: JSON.stringify({ parcel: payload }),
  });
}

export async function getParcel(parcelId: number): Promise<SendcloudParcelResponse> {
  return sendcloudFetch<SendcloudParcelResponse>(`/parcels/${parcelId}`);
}

export type SendcloudCancelResponse = { status: string; message: string };

export async function cancelParcel(parcelId: number): Promise<SendcloudCancelResponse> {
  const res = await fetch(`${SENDCLOUD_API_BASE}/parcels/${parcelId}/cancel`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: getAuthHeader(),
    },
  });

  const body = await res.json().catch(() => ({ status: "error", message: "Invalid response" }));

  // 200 = cancelled, 202 = queued, 410 = deleted (all OK)
  if (res.status === 200 || res.status === 202 || res.status === 410) {
    // SAFETY: response matches SendcloudCancelResponse shape per API spec
    return body as SendcloudCancelResponse;
  }

  // 400 = already cancelled/delivered, 404 = not found
  const msg = (body as { message?: string }).message ?? `Cancel failed (${res.status})`;
  throw new Error(msg);
}
