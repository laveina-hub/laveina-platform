import {
  cancelShipment,
  createEventSubscription,
  createEventSubscriptionConnection,
  createShipmentSync,
  fetchShippingOptions,
  getShipment,
  listEventSubscriptionConnections,
  listEventSubscriptions,
} from "@/lib/sendcloud/client";
import type { ApiResponse } from "@/types/api";
import type {
  SendcloudRateOption,
  SendcloudV3CreateShipmentRequest,
  SendcloudV3Priority,
  SendcloudV3ShipmentParcel,
  SendcloudV3ShippingOption,
} from "@/types/sendcloud";

const EXPRESS_MAX_LEAD_HOURS = 24;
// Some carriers map to "priority"/"express" in `functionalities.priority`;
// others leave that field absent and only distinguish via lead time.
const EXPRESS_PRIORITIES: ReadonlySet<SendcloudV3Priority> = new Set<SendcloudV3Priority>([
  "priority",
  "express",
]);

export type SendcloudRates = {
  standard: SendcloudRateOption;
  express: SendcloudRateOption | null;
};

// No mock fallback lives in this module by design. Prices drive real money,
// so if SendCloud credentials are missing or the API is unreachable we must
// fail closed — the caller receives an ApiError and the booking wizard
// blocks Continue rather than silently quoting a fabricated rate.

/** Extract the cheapest quote total (in cents) from a v3 shipping option. */
function optionRateCents(option: SendcloudV3ShippingOption): number | null {
  const quotes = option.quotes ?? [];
  if (quotes.length === 0) return null;
  let best: number | null = null;
  for (const q of quotes) {
    const value = parseFloat(q.price.total.value);
    if (!Number.isFinite(value) || value <= 0) continue;
    const cents = Math.round(value * 100);
    if (best === null || cents < best) best = cents;
  }
  return best;
}

function optionLeadTimeHours(option: SendcloudV3ShippingOption): number | null {
  const quotes = option.quotes ?? [];
  for (const q of quotes) {
    if (typeof q.lead_time === "number" && q.lead_time > 0) return q.lead_time;
  }
  return null;
}

function isExpressOption(option: SendcloudV3ShippingOption): boolean {
  const priority = option.functionalities?.priority;
  if (priority && EXPRESS_PRIORITIES.has(priority)) return true;
  const lead = optionLeadTimeHours(option);
  return lead != null && lead <= EXPRESS_MAX_LEAD_HOURS;
}

function toRateOption(option: SendcloudV3ShippingOption, rateCents: number): SendcloudRateOption {
  const lead = optionLeadTimeHours(option);
  const estimatedDays = lead != null ? String(Math.max(1, Math.ceil(lead / 24))) : null;
  return {
    // Legacy numeric id kept for back-compat with `shipping_method_id` column.
    shippingMethodId: stringCodeToId(option.code),
    // v3 primary carrier selector. Persisted alongside and replayed at dispatch.
    shippingOptionCode: option.code,
    name: option.name,
    carrier: option.carrier.code,
    rateCents,
    estimatedDays,
  };
}

/** Stable hash so the same v3 option code always maps to the same legacy id. */
function stringCodeToId(code: string): number {
  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    hash = (hash * 31 + code.charCodeAt(i)) | 0;
  }
  // Strip sign and keep 31 bits so the value fits in a PG integer column.
  return Math.abs(hash);
}

export type SendcloudParcelSpec = {
  weightKg: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
};

function toV3Parcel(spec: SendcloudParcelSpec) {
  const hasDims =
    typeof spec.lengthCm === "number" &&
    typeof spec.widthCm === "number" &&
    typeof spec.heightCm === "number";
  return {
    weight: { value: spec.weightKg.toFixed(3), unit: "kg" as const },
    ...(hasDims
      ? {
          dimensions: {
            length: String(spec.lengthCm),
            width: String(spec.widthCm),
            height: String(spec.heightCm),
            unit: "cm" as const,
          },
        }
      : {}),
  };
}

/**
 * Fetches Standard (cheapest non-express) and Express (≤24h) rates for a
 * Spain→Spain shipment using the v3 /shipping-options endpoint.
 *
 * Accepts **all parcels of the order in one call** — SendCloud v3 returns a
 * single bundle rate (`quotes.price.total`) per shipping-option, and the
 * carrier applies its own volumetric rule per parcel internally. This matches
 * real-world dispatch where one driver picks up N boxes for one order.
 *
 * The returned `rateCents` is the bundled total (ex-VAT). Callers split it
 * across parcels proportionally (usually by billable weight) for display and
 * persistence.
 */
export async function getAvailableRates(params: {
  parcels: SendcloudParcelSpec[];
  fromPostalCode: string;
  toPostalCode: string;
}): Promise<ApiResponse<SendcloudRates>> {
  const { parcels, fromPostalCode, toPostalCode } = params;

  if (parcels.length === 0) {
    return {
      data: null,
      error: { message: "sendcloud.noParcelsProvided", status: 400 },
    };
  }

  try {
    const response = await fetchShippingOptions({
      from_country_code: "ES",
      to_country_code: "ES",
      from_postal_code: fromPostalCode,
      to_postal_code: toPostalCode,
      parcels: parcels.map(toV3Parcel),
      calculate_quotes: true,
    });

    const options = response.data ?? [];
    if (options.length === 0) {
      return {
        data: null,
        error: { message: "sendcloud.noEligibleMethods", status: 422 },
      };
    }

    type PricedOption = { option: SendcloudV3ShippingOption; rateCents: number };
    const priced: PricedOption[] = [];
    for (const option of options) {
      const rateCents = optionRateCents(option);
      if (rateCents === null) continue;
      priced.push({ option, rateCents });
    }
    if (priced.length === 0) {
      return {
        data: null,
        error: { message: "sendcloud.noEligibleMethods", status: 422 },
      };
    }

    const expressPool = priced.filter((p) => isExpressOption(p.option));
    const standardPool = priced.filter((p) => !isExpressOption(p.option));

    // Cheapest non-express → Standard. Cheapest express (if any) → Express.
    const standardSorted =
      standardPool.length > 0
        ? [...standardPool].sort((a, b) => a.rateCents - b.rateCents)
        : [...priced].sort((a, b) => a.rateCents - b.rateCents);
    const expressSorted =
      expressPool.length > 0 ? [...expressPool].sort((a, b) => a.rateCents - b.rateCents) : [];

    const cheapestStd = standardSorted[0];
    if (!cheapestStd) {
      return {
        data: null,
        error: { message: "sendcloud.noEligibleMethods", status: 422 },
      };
    }

    const standard = toRateOption(cheapestStd.option, cheapestStd.rateCents);
    const express = expressSorted[0]
      ? toRateOption(expressSorted[0].option, expressSorted[0].rateCents)
      : null;

    // Dev-facing trail. Grep `[sendcloud] /shipping-options` in the server log.
    const totalWeight = parcels.reduce((s, p) => s + p.weightKg, 0);
    console.info(
      `[sendcloud] /shipping-options ${fromPostalCode}→${toPostalCode} ${parcels.length} parcel(s) ${totalWeight.toFixed(3)}kg → ${priced.length} priced option(s)`
    );
    console.info(
      `[sendcloud]   picked standard: ${standard.carrier} ${standard.shippingOptionCode} ${standard.rateCents}c (${(standard.rateCents / 100).toFixed(2)} €) lead=${standard.estimatedDays ?? "?"}d  [bundle total]`
    );
    if (express) {
      console.info(
        `[sendcloud]   picked express:  ${express.carrier} ${express.shippingOptionCode} ${express.rateCents}c (${(express.rateCents / 100).toFixed(2)} €) lead=${express.estimatedDays ?? "?"}d  [bundle total]`
      );
    } else {
      console.info(`[sendcloud]   picked express:  none (no eligible ≤24h option)`);
    }

    return { data: { standard, express }, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "sendcloud.unknownError";
    console.warn(
      `[sendcloud] /shipping-options failed for ${fromPostalCode}→${toPostalCode}: ${message}`
    );
    return { data: null, error: { message, status: 502 } };
  }
}

export type DispatchedShipment = {
  /** v3 shipment identifier (string UUID). Used for cancel + GET shipment. */
  sendcloudShipmentId: string;
  /** v3 parcel id inside the shipment (integer). Used to correlate the
   *  SendCloud tracking webhook back to our shipments row. */
  sendcloudParcelId: number | null;
  carrierCode: string | null;
  carrierName: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  labelUrl: string | null;
  statusCode: string;
  statusMessage: string;
};

function extractLabelUrl(parcel: SendcloudV3ShipmentParcel): string | null {
  const docs = parcel.documents ?? [];
  const label = docs.find((d) => d.type === "label");
  return label?.link ?? null;
}

export type BundleParcelInput = {
  /** Laveina tracking id (e.g. `LAV-...`). Becomes the SendCloud `order_number`
   *  on that parcel so webhooks can correlate back. */
  trackingId: string;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
};

export type BundleDispatchResult = {
  /** SendCloud shipment id — shared by every parcel in the bundle. */
  sendcloudShipmentId: string;
  /** Per-parcel dispatch results, returned in the same order SendCloud
   *  echoes them — callers correlate back to their rows via `trackingId`
   *  (echoed in the parcel's `order_number`). */
  parcels: DispatchedShipment[];
  carrierCode: string | null;
  carrierName: string | null;
};

/**
 * Dispatch N parcels (1–5) of one order as a single SendCloud v3 shipment.
 *
 * This is the right primitive for Laveina's model: one sender, one receiver,
 * one pickup — N boxes. SendCloud returns one `shipment_id` with N
 * `parcel_id`s inside, one tracking number + label per parcel. Carriers see
 * this as a single waybill on their dashboard.
 *
 * For single-parcel orders, pass a 1-element array — no penalty.
 */
export async function dispatchShipmentBundle(params: {
  shippingOptionCode: string;
  receiverName: string;
  receiverPhone: string;
  destinationAddress: string;
  destinationCity: string;
  destinationPostcode: string;
  senderName: string;
  senderPhone: string;
  senderAddress: string;
  senderCity: string;
  senderPostcode: string;
  parcels: BundleParcelInput[];
  /** Order-level reference. Typically the booking's Stripe session id — lets
   *  ops correlate the whole bundle externally. */
  orderReference: string;
}): Promise<ApiResponse<BundleDispatchResult>> {
  if (params.parcels.length === 0) {
    return { data: null, error: { message: "sendcloud.noParcelsToDispatch", status: 400 } };
  }

  const body: SendcloudV3CreateShipmentRequest = {
    from_address: {
      name: params.senderName,
      address_line_1: params.senderAddress,
      postal_code: params.senderPostcode,
      city: params.senderCity,
      country_code: "ES",
      phone_number: params.senderPhone,
    },
    to_address: {
      name: params.receiverName,
      address_line_1: params.destinationAddress,
      postal_code: params.destinationPostcode,
      city: params.destinationCity,
      country_code: "ES",
      phone_number: params.receiverPhone,
    },
    ship_with: {
      type: "shipping_option_code",
      properties: { shipping_option_code: params.shippingOptionCode },
    },
    parcels: params.parcels.map((p) => ({
      weight: { value: p.weightKg.toFixed(3), unit: "kg" },
      dimensions: {
        length: String(p.lengthCm),
        width: String(p.widthCm),
        height: String(p.heightCm),
        unit: "cm",
      },
      order_number: p.trackingId,
    })),
    order_number: params.orderReference,
    external_reference_id: params.orderReference,
  };

  try {
    const response = await createShipmentSync(body);
    const shipment = response.data;

    // v3 surfaces carrier validation failures in a 200 body — demote to error.
    if (shipment.errors && shipment.errors.length > 0) {
      const first = shipment.errors[0];
      return {
        data: null,
        error: {
          message: first.detail || first.code || "sendcloud.dispatchFailed",
          code: first.code,
          status: 502,
        },
      };
    }

    if (!shipment.parcels || shipment.parcels.length === 0) {
      return { data: null, error: { message: "sendcloud.noParcelInResponse", status: 502 } };
    }

    if (shipment.parcels.length !== params.parcels.length) {
      console.warn(
        `[sendcloud] dispatchShipmentBundle: expected ${params.parcels.length} parcels back, got ${shipment.parcels.length}`
      );
    }

    const parcels: DispatchedShipment[] = shipment.parcels.map((p) => ({
      sendcloudShipmentId: shipment.id,
      sendcloudParcelId: p.id,
      carrierCode: shipment.carrier?.code ?? null,
      carrierName: shipment.carrier?.name ?? null,
      trackingNumber: p.tracking_number,
      trackingUrl: p.tracking_url ?? null,
      labelUrl: extractLabelUrl(p),
      statusCode: p.status.code,
      statusMessage: p.status.message,
    }));

    return {
      data: {
        sendcloudShipmentId: shipment.id,
        parcels,
        carrierCode: shipment.carrier?.code ?? null,
        carrierName: shipment.carrier?.name ?? null,
      },
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "sendcloud.dispatchFailed";
    return { data: null, error: { message, status: 502 } };
  }
}

/**
 * Dispatch a single parcel. Thin wrapper around `dispatchShipmentBundle` for
 * back-compat with callers that only have per-parcel data. Prefer
 * `dispatchShipmentBundle` directly when you have the full order — cheaper
 * on API quota, and the carrier gets one waybill instead of N.
 */
export async function dispatchParcel(params: {
  shippingOptionCode: string;
  receiverName: string;
  receiverPhone: string;
  destinationAddress: string;
  destinationCity: string;
  destinationPostcode: string;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  trackingId: string;
  senderName: string;
  senderPhone: string;
  senderAddress: string;
  senderCity: string;
  senderPostcode: string;
}): Promise<ApiResponse<DispatchedShipment>> {
  const bundle = await dispatchShipmentBundle({
    shippingOptionCode: params.shippingOptionCode,
    receiverName: params.receiverName,
    receiverPhone: params.receiverPhone,
    destinationAddress: params.destinationAddress,
    destinationCity: params.destinationCity,
    destinationPostcode: params.destinationPostcode,
    senderName: params.senderName,
    senderPhone: params.senderPhone,
    senderAddress: params.senderAddress,
    senderCity: params.senderCity,
    senderPostcode: params.senderPostcode,
    parcels: [
      {
        trackingId: params.trackingId,
        weightKg: params.weightKg,
        lengthCm: params.lengthCm,
        widthCm: params.widthCm,
        heightCm: params.heightCm,
      },
    ],
    orderReference: params.trackingId,
  });

  if (bundle.error || !bundle.data) {
    return {
      data: null,
      error: bundle.error ?? { message: "sendcloud.dispatchFailed", status: 502 },
    };
  }

  const [first] = bundle.data.parcels;
  if (!first) {
    return { data: null, error: { message: "sendcloud.noParcelInResponse", status: 502 } };
  }
  return { data: first, error: null };
}

/** Cancel a SendCloud v3 shipment (before carrier pickup). */
export async function cancelSendcloudParcel(
  sendcloudShipmentId: string
): Promise<ApiResponse<{ status: string; message: string }>> {
  try {
    const result = await cancelShipment(sendcloudShipmentId);
    // v3 returns either `{ data: { status, message } }` or the flat shape
    // `{ status, message }` depending on the carrier. Normalise both.
    const status = result.data?.status ?? result.status ?? "cancelled";
    const message = result.data?.message ?? result.message ?? "Shipment cancellation requested";
    return { data: { status, message }, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "sendcloud.cancelFailed";
    return { data: null, error: { message, status: 400 } };
  }
}

/** Fetch current shipment/parcel status from SendCloud v3 (manual sync). */
export async function getSendcloudParcelStatus(sendcloudShipmentId: string): Promise<
  ApiResponse<{
    statusCode: string;
    statusMessage: string;
    trackingNumber: string | null;
    trackingUrl: string | null;
    labelUrl: string | null;
  }>
> {
  try {
    const { data: shipment } = await getShipment(sendcloudShipmentId);
    const parcel = shipment.parcels[0];
    if (!parcel) {
      return {
        data: null,
        error: { message: "sendcloud.noParcelInResponse", status: 502 },
      };
    }
    return {
      data: {
        statusCode: parcel.status.code,
        statusMessage: parcel.status.message,
        trackingNumber: parcel.tracking_number,
        trackingUrl: parcel.tracking_url ?? null,
        labelUrl: extractLabelUrl(parcel),
      },
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "sendcloud.fetchFailed";
    return { data: null, error: { message, status: 502 } };
  }
}

export type RegisterEventSubscriptionResult = {
  webhookUrl: string;
  connectionId: string;
  connectionCreated: boolean;
  subscriptionCreated: boolean;
  /** Per-connection HMAC secret. SendCloud returns this only at creation
   *  time, so it's null when we reused an existing connection. */
  connectionSecret: string | null;
  status: "registered" | "already_registered";
};

/**
 * Ensure a SendCloud Event Subscription exists for our webhook URL + the
 * `parcel.status_changed` event. Idempotent: returns "already_registered"
 * when both the connection + subscription already exist.
 */
export async function registerEventSubscription(
  webhookUrl: string
): Promise<ApiResponse<RegisterEventSubscriptionResult>> {
  try {
    const existingConnections = await listEventSubscriptionConnections();
    let connection = existingConnections.find((c) => c.url === webhookUrl);

    let connectionCreated = false;
    if (!connection) {
      connection = await createEventSubscriptionConnection({ url: webhookUrl });
      connectionCreated = true;
    }

    const existingSubscriptions = await listEventSubscriptions();
    const alreadySubscribed = existingSubscriptions.some(
      (s) => s.connection_id === connection!.id && s.event_type === "parcel.status_changed"
    );

    let subscriptionCreated = false;
    if (!alreadySubscribed) {
      await createEventSubscription({
        connection_id: connection.id,
        event_type: "parcel.status_changed",
      });
      subscriptionCreated = true;
    }

    return {
      data: {
        webhookUrl,
        connectionId: connection.id,
        connectionCreated,
        subscriptionCreated,
        connectionSecret: connectionCreated ? (connection.secret ?? null) : null,
        status: connectionCreated || subscriptionCreated ? "registered" : "already_registered",
      },
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "sendcloud.registerFailed";
    return { data: null, error: { message, status: 502 } };
  }
}
