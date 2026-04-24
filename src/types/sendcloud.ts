// Partial SendCloud API types — only fields Laveina uses.

// --- Legacy /shipping_methods endpoint (kept for backward compat) ---

export type SendcloudShippingMethod = {
  id: number;
  name: string;
  carrier: string;
  min_weight: number;
  max_weight: number;
  price: number;
  countries?: SendcloudCountry[];
};

export type SendcloudCountry = {
  id: number;
  name: string;
  iso_2: string;
  iso_3: string;
  price: number;
  lead_time_hours: number | null;
};

export type SendcloudShippingMethodsResponse = {
  shipping_methods: SendcloudShippingMethod[];
};

// --- /shipping-products endpoint (domestic Spain rates) ---

export type SendcloudShippingProduct = {
  name: string;
  carrier: string;
  methods: SendcloudProductMethod[];
  available_functionalities?: {
    last_mile?: string[];
  };
};

export type SendcloudProductMethod = {
  id: number;
  name: string;
  shipping_product_code: string;
  properties: {
    min_weight: number;
    max_weight: number;
    max_dimensions?: {
      length: number;
      width: number;
      height: number;
      unit: string;
    };
  };
  lead_time_hours?: Record<string, Record<string, number>>;
};

export type SendcloudParcelCreate = {
  name: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
  email?: string;
  telephone?: string;
  shipment: {
    id: number;
  };
  weight: string;
  length?: number;
  width?: number;
  height?: number;
  order_number?: string;
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
  label?: { normal_printer: string[] } | null;
  status: { id: number; message: string };
  shipment: { id: number; name: string };
  weight: string;
  order_number: string | null;
};

export type SendcloudParcelResponse = {
  parcel: SendcloudParcel;
};

export type SendcloudWebhookPayload = {
  action: string;
  timestamp: number;
  parcel: {
    id: number;
    tracking_number: string;
    status: { id: number; message: string };
    order_number: string | null;
  };
};

export type SendcloudShippingPrice = {
  price: string | null;
  currency: string | null;
  to_country: string;
  breakdown: { type: string; label: string; value: number }[];
};

export type SendcloudRateOption = {
  /** Legacy numeric id kept for back-compat with the `shipping_method_id`
   *  column on the `shipments` table. v3 quotes hash `shippingOptionCode`
   *  into this field so existing queries keep working. */
  shippingMethodId: number;
  /** v3 carrier+service selector. Required at dispatch time — the v3
   *  Shipments API has no numeric-id fallback. */
  shippingOptionCode: string;
  name: string;
  carrier: string;
  rateCents: number;
  estimatedDays: string | null;
};

// --- /api/v3/shipping-options endpoint (replacement for v2 /shipping-price) ---
// The v3 endpoint accepts full parcel dimensions so each carrier applies its
// own volumetric rule internally (Correos /6000, FedEx /5000, etc.). We stop
// computing volumetric ourselves for SendCloud quotes — we just forward real
// weight + dimensions and trust the response.

export type SendcloudV3WeightUnit = "kg" | "g" | "lbs" | "oz";
export type SendcloudV3DimensionUnit = "cm" | "mm" | "m" | "yd" | "ft" | "in";

export type SendcloudV3Parcel = {
  weight: { value: string; unit: SendcloudV3WeightUnit };
  dimensions?: {
    length: string;
    width: string;
    height: string;
    unit: SendcloudV3DimensionUnit;
  };
  additional_insured_price?: { value: number; currency: string };
  total_insured_price?: { value: number; currency: string };
};

export type SendcloudV3ShippingOptionsRequest = {
  from_country_code?: string;
  to_country_code?: string;
  from_postal_code?: string;
  to_postal_code?: string;
  parcels: SendcloudV3Parcel[];
  /** MUST be `true` to receive pricing; defaults to `false` per API docs. */
  calculate_quotes: boolean;
  carrier_code?: string;
  contract_id?: number;
  shipping_product_code?: string;
  shipping_option_code?: string;
  functionalities?: Record<string, unknown>;
};

export type SendcloudV3Priority = "economical" | "standard" | "priority" | "express";

export type SendcloudV3PriceMoney = { value: string; currency: string };

export type SendcloudV3PriceBreakdownEntry = {
  type: string;
  label: string;
  price: SendcloudV3PriceMoney;
};

export type SendcloudV3Quote = {
  weight: {
    min: { value: string; unit: SendcloudV3WeightUnit };
    max: { value: string; unit: SendcloudV3WeightUnit };
  };
  lead_time: number | null;
  price: {
    breakdown: SendcloudV3PriceBreakdownEntry[];
    total: SendcloudV3PriceMoney;
  };
  estimated_surcharges?: SendcloudV3PriceBreakdownEntry[];
};

export type SendcloudV3ShippingOption = {
  code: string;
  name: string;
  carrier: { code: string; name: string };
  product: { code: string; name: string };
  functionalities: {
    priority?: SendcloudV3Priority;
    [key: string]: unknown;
  };
  contract?: { id: number; client_id: string; carrier_code: string; name: string };
  max_dimensions?: { length: string; width: string; height: string; unit: string };
  weight?: {
    min: { value: string; unit: SendcloudV3WeightUnit };
    max: { value: string; unit: SendcloudV3WeightUnit };
  };
  parcel_billed_weights?: Array<{
    value: string;
    unit: SendcloudV3WeightUnit;
    volumetric: boolean;
    calculation: string | null;
    parcel_number: number;
  }>;
  requirements?: {
    fields?: string[];
    export_documents?: boolean;
    is_service_point_required?: boolean;
  };
  charging_type?: "label_creation" | "first_scan";
  quotes?: SendcloudV3Quote[];
};

export type SendcloudV3ShippingOptionsResponse = {
  data: SendcloudV3ShippingOption[] | null;
  message: string | null;
};

// --- /api/v3/shipments — dispatch API (replaces v2 /parcels) ---
//
// v3 accepts full address objects, dimension-aware parcels, and a
// `ship_with.shipping_option_code` string instead of a numeric shipping
// method id. Sync endpoint (`/shipments`) returns labels inline so we
// don't need a separate label-fetch step.

export type SendcloudV3Address = {
  name: string;
  address_line_1: string;
  address_line_2?: string;
  house_number?: string;
  postal_code: string;
  city: string;
  country_code: string;
  company_name?: string;
  email?: string;
  phone_number?: string;
  state_province_code?: string;
  po_box?: string | null;
};

export type SendcloudV3ShipWith = {
  type: "shipping_option_code";
  properties: {
    shipping_option_code: string;
    contract_id?: number;
  };
};

export type SendcloudV3CreateShipmentRequest = {
  from_address: SendcloudV3Address;
  to_address: SendcloudV3Address;
  ship_with: SendcloudV3ShipWith;
  parcels: Array<SendcloudV3Parcel & { order_number?: string }>;
  order_number?: string;
  external_reference_id?: string;
  brand_id?: number;
};

export type SendcloudV3ParcelStatus = {
  code: string;
  message: string;
};

export type SendcloudV3ParcelDocument = {
  type: "label" | "air-waybill" | "commercial-invoice";
  size: "a6" | "a4";
  link: string;
};

export type SendcloudV3ShipmentParcel = {
  id: number;
  status: SendcloudV3ParcelStatus;
  documents?: SendcloudV3ParcelDocument[];
  tracking_number: string | null;
  tracking_url: string | null;
  dimensions?: { length: string; width: string; height: string; unit: string };
  weight?: { value: string; unit: string };
  announced_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type SendcloudV3Shipment = {
  /** v3 shipment identifier (string, UUID-like). */
  id: string;
  order_number?: string;
  external_reference_id?: string | null;
  parcels: SendcloudV3ShipmentParcel[];
  from_address: SendcloudV3Address;
  to_address: SendcloudV3Address;
  ship_with: SendcloudV3ShipWith;
  carrier?: { code: string; name: string };
  /** When a sync create partially fails (carrier validation etc.) v3 still
   *  returns 200; the errors live here instead of an HTTP error status. */
  errors?: Array<{ detail: string; code: string; status?: string }>;
};

export type SendcloudV3CreateShipmentResponse = {
  data: SendcloudV3Shipment;
};

export type SendcloudV3GetShipmentResponse = {
  data: SendcloudV3Shipment;
};

export type SendcloudV3CancelResponse = {
  data?: { status: string; message?: string };
  status?: string;
  message?: string;
};

// --- /api/v3/webhooks/parcel-status-changed (classic v3 webhook payload) ---
// The v3 webhook delivers the same parcel shape as `GET /shipments/{id}`,
// so status uses the `{ code: string, message: string }` object instead of
// the v2 `{ id: number, message: string }` shape.

export type SendcloudV3ParcelStatusChangedPayload = {
  action: "parcel_status_changed";
  timestamp: number;
  /** Parcel shape matching the v3 Shipments GET response. */
  parcel: {
    /** Parcel id is still an integer in v3 (only the shipment id is a string). */
    id: number;
    tracking_number?: string | null;
    status: {
      code: string;
      message: string;
    };
  };
};

// --- /api/v3/event-subscriptions — v3-native replacement for classic webhooks ---
//
// v3 splits webhook registration into two resources:
//   - `connections` — a URL + secret that can receive events
//   - `subscriptions` — which event types a given connection listens for
//
// Rotating a secret or changing event coverage is an API call; no dashboard
// toggling required. Subscriptions can be test-fired by the API which makes
// ops verification straightforward.

export type SendcloudV3EventType =
  /** Emitted when the parcel tracking status changes. */
  | "parcel.status_changed"
  /** Emitted when a return is created from a parcel. */
  | "return.created"
  | "integration.connected"
  | "integration.deleted"
  | "integration.modified";

export type SendcloudV3EventSubscriptionConnection = {
  id: string;
  url: string;
  /** Per-connection HMAC secret. Returned only at creation time. */
  secret?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type SendcloudV3CreateConnectionRequest = {
  url: string;
  /** Optional custom secret. If omitted, SendCloud generates one. */
  secret?: string;
};

export type SendcloudV3EventSubscription = {
  id: string;
  connection_id: string;
  event_type: SendcloudV3EventType;
  created_at?: string;
  updated_at?: string;
};

export type SendcloudV3CreateSubscriptionRequest = {
  connection_id: string;
  event_type: SendcloudV3EventType;
};

/** Data shape SendCloud POSTs to the registered connection URL when an
 *  event fires. The `data` payload varies by `event_type`. */
export type SendcloudV3EventDelivery<T = unknown> = {
  event_type: SendcloudV3EventType;
  event_id?: string;
  timestamp?: number;
  data: T;
};

/** `parcel.status_changed` event payload delivered via Event Subscriptions. */
export type SendcloudV3ParcelStatusChangedEventData = {
  parcel: {
    id: number;
    tracking_number?: string | null;
    status: { code: string; message: string };
  };
};
