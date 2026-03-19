// ─── SendCloud API types ──────────────────────────────────────────────────────
// Only the fields Laveina actually uses are typed here.
// Full SendCloud API docs: https://api.sendcloud.dev/

// ─── Shipping methods (GET /shipping_methods) ─────────────────────────────────

export type SendcloudShippingMethod = {
  id: number;
  name: string;
  carrier: string;
  min_weight: number; // grams
  max_weight: number; // grams
  price: number; // EUR, e.g. 5.99
  countries?: SendcloudCountry[];
};

export type SendcloudCountry = {
  id: number;
  name: string;
  iso_2: string;
  iso_3: string;
  price: number; // country-specific price in EUR
  lead_time_hours: number | null;
};

export type SendcloudShippingMethodsResponse = {
  shipping_methods: SendcloudShippingMethod[];
};

// ─── Parcels (POST /parcels) ──────────────────────────────────────────────────

export type SendcloudParcelCreate = {
  name: string;
  address: string;
  city: string;
  postal_code: string;
  country: string; // ISO-2, e.g. "ES"
  email?: string;
  telephone?: string;
  shipment: {
    id: number; // shipping_method_id
  };
  weight: string; // kg as string, e.g. "1.500"
  order_number?: string; // tracking_id for reference
  request_label: boolean;
  apply_shipping_rules?: boolean;
};

export type SendcloudParcel = {
  id: number;
  name: string;
  address: string;
  postal_code: string;
  city: string;
  country: { iso_2: string };
  tracking_number: string | null;
  tracking_url: string | null;
  label?: { normal_printer: string[] } | null; // PDF URLs
  status: { id: number; message: string };
  shipment: { id: number; name: string };
  weight: string;
  order_number: string | null;
};

export type SendcloudParcelResponse = {
  parcel: SendcloudParcel;
};

// ─── Webhook payload (POST /api/webhooks/sendcloud) ──────────────────────────

export type SendcloudWebhookPayload = {
  action: string; // e.g. "parcel_status_changed"
  timestamp: number;
  parcel: {
    id: number;
    tracking_number: string;
    status: { id: number; message: string };
    order_number: string | null;
  };
};

// ─── Rates response (internal shape returned by pricing.service.ts) ───────────

export type SendcloudRateOption = {
  shippingMethodId: number;
  name: string;
  carrier: string;
  rateCents: number; // raw carrier price × 100 (no margin applied)
  estimatedDays: string | null;
};
