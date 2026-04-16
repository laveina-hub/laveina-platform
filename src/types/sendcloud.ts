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
  shippingMethodId: number;
  name: string;
  carrier: string;
  rateCents: number;
  estimatedDays: string | null;
};
