/** Template names must match what's configured in the Gallabox dashboard /
 *  Meta Business Manager.
 *
 *  C3 (Laveina M2 Answers Final, 2026-04-21): the canonical M2 set is six
 *  `*_es` templates (Spanish only for launch — see A8). Internal keys are
 *  kept stable so call sites don't churn. Two mappings collapse:
 *    - `RECEIVED_AT_ORIGIN` → `shipment_update_es` (generic fallback; Meta
 *      template must accept {{1}}=name, {{2}}=shop_name, {{3}}=tracking_id
 *      OR the sendReceivedAtOrigin caller must be updated to match the
 *      shared `shipment_update_es` param shape).
 *    - `DELIVERY_SENDER` + `DELIVERY_RECEIVER` → `delivered_es` (a single
 *      Meta template handles both audiences; call sites differ only by
 *      to-phone + recipient-name param).
 *
 *  Client to confirm which 3 of the 6 are already approved by Meta. In dev
 *  the Gallabox client logs + returns a stub id for unapproved templates,
 *  so unapproved ones fail gracefully without breaking the flow. */

export const WHATSAPP_TEMPLATES = {
  SHIPMENT_CONFIRMATION: "order_confirmation_es",
  RECEIVED_AT_ORIGIN: "shipment_update_es",
  IN_TRANSIT: "in_transit_es",
  /** Q14.1.8 — generic status-change template (e.g. exception, delay).
   *  Pairs with the customer-facing `shipment_update` row in the 6×3 A10
   *  preferences matrix (see `notification-prefs.ts`). The catch-all
   *  WhatsApp send sites should switch to this when a transition doesn't
   *  fit the more specific templates. */
  SHIPMENT_UPDATE: "shipment_update_es",
  READY_FOR_PICKUP: "ready_for_pickup_es",
  OTP_VERIFICATION: "pickup_otp_es",
  DELIVERY_SENDER: "delivered_es",
  DELIVERY_RECEIVER: "delivered_es",
} as const;

export type WhatsAppTemplate = (typeof WHATSAPP_TEMPLATES)[keyof typeof WHATSAPP_TEMPLATES];

export const GALLABOX_MAX_RETRIES = 2;
export const GALLABOX_RETRY_BASE_DELAY_MS = 1000;

// Human-readable status labels live in `shipmentStatus` i18n namespace —
// status-update notifications (WhatsApp + email) translate at send time using
// the customer's `preferred_locale`.
