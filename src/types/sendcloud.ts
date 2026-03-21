// Partial SendCloud API types — only fields Laveina uses.

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

export type SendcloudRateOption = {
  shippingMethodId: number;
  name: string;
  carrier: string;
  rateCents: number;
  estimatedDays: string | null;
};
