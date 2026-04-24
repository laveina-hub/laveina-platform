// A10 (client answer 2026-04-21): notification preferences matrix.
// 6 templates × 3 channels. Defaults are applied every time a customer opens
// the preferences page without an existing row — treats the DB JSONB as
// "user overrides" on top of this canonical set.
//
// Mandatory rows cannot be disabled:
//   - order_confirmation (transactional receipt)
//   - ready_for_pickup (the parcel can't be collected without it)
//   - pickup_otp (security requirement)
// The UI locks those rows visually; the PATCH endpoint re-forces the channel
// booleans to true server-side so a tampered payload can't bypass.

export const NOTIFICATION_CHANNELS = ["dashboard", "whatsapp", "email"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_TEMPLATES = [
  "order_confirmation",
  "in_transit",
  "shipment_update",
  "ready_for_pickup",
  "pickup_otp",
  "delivered",
] as const;
export type NotificationTemplate = (typeof NOTIFICATION_TEMPLATES)[number];

export const MANDATORY_TEMPLATES: readonly NotificationTemplate[] = [
  "order_confirmation",
  "ready_for_pickup",
  "pickup_otp",
] as const;

export function isMandatoryTemplate(template: NotificationTemplate): boolean {
  return (MANDATORY_TEMPLATES as readonly string[]).includes(template);
}

export type NotificationPrefs = Record<NotificationTemplate, Record<NotificationChannel, boolean>>;

/** A10 defaults — all ON except In-Transit + Shipment-Update Email. */
export const NOTIFICATION_DEFAULTS: NotificationPrefs = {
  order_confirmation: { dashboard: true, whatsapp: true, email: true },
  in_transit: { dashboard: true, whatsapp: true, email: false },
  shipment_update: { dashboard: true, whatsapp: true, email: false },
  ready_for_pickup: { dashboard: true, whatsapp: true, email: true },
  pickup_otp: { dashboard: true, whatsapp: true, email: true },
  delivered: { dashboard: true, whatsapp: true, email: true },
};

/** Merges partial overrides onto the canonical defaults so the matrix always
 *  has a full 6×3 answer, even for older rows that predate new templates. */
export function resolveNotificationPrefs(raw: unknown): NotificationPrefs {
  const result: NotificationPrefs = {
    order_confirmation: { ...NOTIFICATION_DEFAULTS.order_confirmation },
    in_transit: { ...NOTIFICATION_DEFAULTS.in_transit },
    shipment_update: { ...NOTIFICATION_DEFAULTS.shipment_update },
    ready_for_pickup: { ...NOTIFICATION_DEFAULTS.ready_for_pickup },
    pickup_otp: { ...NOTIFICATION_DEFAULTS.pickup_otp },
    delivered: { ...NOTIFICATION_DEFAULTS.delivered },
  };

  if (!raw || typeof raw !== "object") return enforceMandatory(result);
  const obj = raw as Record<string, unknown>;

  for (const template of NOTIFICATION_TEMPLATES) {
    const row = obj[template];
    if (!row || typeof row !== "object") continue;
    const rowObj = row as Record<string, unknown>;
    for (const channel of NOTIFICATION_CHANNELS) {
      if (typeof rowObj[channel] === "boolean") {
        result[template][channel] = rowObj[channel] as boolean;
      }
    }
  }

  return enforceMandatory(result);
}

/**
 * Pure prefs gate — given a raw prefs JSONB and (template, channel), returns
 * whether that channel is allowed. Mandatory templates bypass prefs per A10.
 */
export function isChannelAllowed(
  rawPrefs: unknown,
  template: NotificationTemplate,
  channel: NotificationChannel
): boolean {
  if (isMandatoryTemplate(template)) return true;
  const prefs = resolveNotificationPrefs(rawPrefs);
  return prefs[template][channel];
}

/** Force every channel of every mandatory template to true, regardless of
 *  what the caller supplied. */
export function enforceMandatory(prefs: NotificationPrefs): NotificationPrefs {
  const copy: NotificationPrefs = {
    order_confirmation: { ...prefs.order_confirmation },
    in_transit: { ...prefs.in_transit },
    shipment_update: { ...prefs.shipment_update },
    ready_for_pickup: { ...prefs.ready_for_pickup },
    pickup_otp: { ...prefs.pickup_otp },
    delivered: { ...prefs.delivered },
  };
  for (const template of MANDATORY_TEMPLATES) {
    copy[template] = { dashboard: true, whatsapp: true, email: true };
  }
  return copy;
}
