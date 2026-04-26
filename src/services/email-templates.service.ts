import { getTranslations } from "next-intl/server";

import { env } from "@/env";
import {
  escapeHtml,
  joinParagraphs,
  normalizeLocale,
  renderDetails,
  renderLink,
  wrapHtml,
} from "@/lib/email/rendering";
import { sendTemplatedEmail, type EmailResult } from "@/services/email.service";
import type { DeliverySpeed, ShipmentStatus } from "@/types/enums";

// A9 (Laveina M2 Answers Final, 2026-04-21): receivers always get Spanish at
// M2 launch regardless of the sender's preferred locale. Lifted to a constant
// so when multilingual receiver notifications land we can delete this + pipe
// a receiverLocale through instead of flipping every call site.
const M2_RECEIVER_LOCALE = "es";

// Q10.5 — build an absolute tracking URL for customer-facing emails. Uses
// NEXT_PUBLIC_APP_URL when set; falls back to a relative link so the email
// still renders something clickable when run without the env var (dev).
function buildTrackingUrl(trackingId: string): string {
  const base = env.NEXT_PUBLIC_APP_URL ?? "";
  return base ? `${base}/tracking/${trackingId}` : `/tracking/${trackingId}`;
}

// Per-template shipment email senders. Each function mirrors the WhatsApp
// surface in `notification.service.ts` so call sites can fire both channels
// in parallel. HTML rendering happens here; user-supplied strings (names,
// shop names, etc.) are escaped before interpolation into the template.

export async function sendShipmentConfirmationEmail(params: {
  shipmentId: string;
  to: string;
  senderName: string;
  trackingId: string;
  origin: string;
  destination: string;
  priceCents: number;
  /** Q10.5 — rendered as a "Delivery Type" line. Defaults to standard. */
  deliverySpeed?: DeliverySpeed;
  locale?: string | null;
}): Promise<EmailResult> {
  const locale = normalizeLocale(params.locale);
  const t = await getTranslations({ locale, namespace: "emails" });
  const subject = t("shipmentConfirmation.subject", { trackingId: params.trackingId });
  const deliveryLabel = t(`deliverySpeedLabel.${params.deliverySpeed ?? "standard"}`);
  const trackingUrl = buildTrackingUrl(params.trackingId);
  const body = joinParagraphs(
    t("shipmentConfirmation.intro"),
    renderDetails([
      { label: t("shipmentConfirmation.trackingIdLabel"), value: params.trackingId },
      { label: t("shipmentConfirmation.pickupPointLabel"), value: params.origin },
      { label: t("shipmentConfirmation.destinationLabel"), value: params.destination },
      { label: t("shipmentConfirmation.deliveryTypeLabel"), value: deliveryLabel },
      {
        label: t("shipmentConfirmation.amountPaidLabel"),
        value: `€${(params.priceCents / 100).toFixed(2)}`,
      },
    ]),
    t("shipmentConfirmation.outro"),
    renderLink(trackingUrl, t("shipmentConfirmation.trackingCta"))
  );
  const html = wrapHtml({
    greeting: t("greeting", { name: escapeHtml(params.senderName) }),
    body,
    signoff: t("signoff"),
    support: t("supportLine"),
  });

  return sendTemplatedEmail({
    shipmentId: params.shipmentId,
    to: params.to,
    template: "order_confirmation",
    subject,
    body: html,
    audience: "sender",
  });
}

// Q3.4 — initial notification to the receiver at booking time. Fires after
// the Stripe webhook confirms payment, alongside the sender confirmation.
// Reuses the `order_confirmation` template slot because it's mandatory and
// bypasses the prefs gate for receivers (receivers don't have accounts).
export async function sendBookingNotificationToReceiverEmail(params: {
  shipmentId: string;
  to: string;
  receiverName: string;
  senderName: string;
  trackingId: string;
  originName: string;
  destinationName: string;
  destinationAddress: string;
  /** Accepted for API compatibility; ignored at M2 — see A9. */
  locale?: string | null;
}): Promise<EmailResult> {
  // A9 — always Spanish for M2 receiver notifications.
  const t = await getTranslations({ locale: M2_RECEIVER_LOCALE, namespace: "emails" });
  const subject = t("receiverBookingNotification.subject", { trackingId: params.trackingId });
  const trackingUrl = buildTrackingUrl(params.trackingId);
  const body = joinParagraphs(
    t("receiverBookingNotification.intro", { senderName: escapeHtml(params.senderName) }),
    renderDetails([
      { label: t("receiverBookingNotification.trackingIdLabel"), value: params.trackingId },
      { label: t("receiverBookingNotification.originLabel"), value: params.originName },
      {
        label: t("receiverBookingNotification.destinationLabel"),
        value: `${params.destinationName}, ${params.destinationAddress}`,
      },
    ]),
    t("receiverBookingNotification.outro"),
    t("receiverBookingNotification.pickupCodeNote", {
      destinationName: escapeHtml(params.destinationName),
    }),
    renderLink(trackingUrl, t("receiverBookingNotification.trackingCta"))
  );
  const html = wrapHtml({
    greeting: t("greeting", { name: escapeHtml(params.receiverName) }),
    body,
    signoff: t("signoff"),
    support: t("supportLine"),
  });

  return sendTemplatedEmail({
    shipmentId: params.shipmentId,
    to: params.to,
    template: "order_confirmation",
    subject,
    body: html,
    audience: "receiver",
  });
}

export async function sendReceivedAtOriginEmail(params: {
  shipmentId: string;
  to: string;
  senderName: string;
  trackingId: string;
  shopName: string;
  locale?: string | null;
}): Promise<EmailResult> {
  const t = await getTranslations({ locale: normalizeLocale(params.locale), namespace: "emails" });
  const subject = t("receivedAtOrigin.subject", { trackingId: params.trackingId });
  const html = wrapHtml({
    greeting: t("greeting", { name: escapeHtml(params.senderName) }),
    body: t("receivedAtOrigin.body", { shopName: escapeHtml(params.shopName) }),
    signoff: t("signoff"),
    support: t("supportLine"),
  });

  return sendTemplatedEmail({
    shipmentId: params.shipmentId,
    to: params.to,
    template: "shipment_update",
    subject,
    body: html,
    audience: "sender",
  });
}

export async function sendInTransitEmail(params: {
  shipmentId: string;
  to: string;
  senderName: string;
  trackingId: string;
  locale?: string | null;
}): Promise<EmailResult> {
  const t = await getTranslations({ locale: normalizeLocale(params.locale), namespace: "emails" });
  const subject = t("inTransit.subject", { trackingId: params.trackingId });
  const html = wrapHtml({
    greeting: t("greeting", { name: escapeHtml(params.senderName) }),
    body: t("inTransit.body"),
    signoff: t("signoff"),
    support: t("supportLine"),
  });

  return sendTemplatedEmail({
    shipmentId: params.shipmentId,
    to: params.to,
    template: "in_transit",
    subject,
    body: html,
    audience: "sender",
  });
}

export async function sendReadyForPickupEmail(params: {
  shipmentId: string;
  to: string;
  receiverName: string;
  trackingId: string;
  shopName: string;
  shopAddress: string;
  /** Accepted for API compatibility; ignored at M2 — see A9. */
  locale?: string | null;
}): Promise<EmailResult> {
  // A9 — always Spanish for M2 receiver notifications.
  const t = await getTranslations({ locale: M2_RECEIVER_LOCALE, namespace: "emails" });
  const subject = t("readyForPickup.subject", { trackingId: params.trackingId });
  const html = wrapHtml({
    greeting: t("greeting", { name: escapeHtml(params.receiverName) }),
    body: t("readyForPickup.body", {
      shopName: escapeHtml(params.shopName),
      shopAddress: escapeHtml(params.shopAddress),
    }),
    signoff: t("signoff"),
    support: t("supportLine"),
  });

  return sendTemplatedEmail({
    shipmentId: params.shipmentId,
    to: params.to,
    template: "ready_for_pickup",
    subject,
    body: html,
    audience: "receiver",
  });
}

export async function sendDeliveryToSenderEmail(params: {
  shipmentId: string;
  to: string;
  senderName: string;
  trackingId: string;
  locale?: string | null;
}): Promise<EmailResult> {
  const t = await getTranslations({ locale: normalizeLocale(params.locale), namespace: "emails" });
  const subject = t("deliveryToSender.subject", { trackingId: params.trackingId });
  const html = wrapHtml({
    greeting: t("greeting", { name: escapeHtml(params.senderName) }),
    body: t("deliveryToSender.body"),
    signoff: t("signoff"),
    support: t("supportLine"),
  });

  return sendTemplatedEmail({
    shipmentId: params.shipmentId,
    to: params.to,
    template: "delivered",
    subject,
    body: html,
    audience: "sender",
  });
}

export async function sendDeliveryToReceiverEmail(params: {
  shipmentId: string;
  to: string;
  receiverName: string;
  trackingId: string;
  /** Q13.1 / Q13.2 — public URL that opens the delivery-confirm page with a
   *  one-off tokenized link. When absent, the body omits the Rate CTA. */
  confirmationUrl?: string;
  /** Accepted for API compatibility; ignored at M2 — see A9. */
  locale?: string | null;
}): Promise<EmailResult> {
  // A9 — always Spanish for M2 receiver notifications.
  const t = await getTranslations({ locale: M2_RECEIVER_LOCALE, namespace: "emails" });
  const subject = t("deliveryToReceiver.subject", { trackingId: params.trackingId });
  const body = params.confirmationUrl
    ? joinParagraphs(
        t("deliveryToReceiver.body"),
        `${renderLink(params.confirmationUrl, t("deliveryToReceiver.rateCta"))} — ${escapeHtml(t("deliveryToReceiver.rateNote"))}`
      )
    : t("deliveryToReceiver.body");
  const html = wrapHtml({
    greeting: t("greeting", { name: escapeHtml(params.receiverName) }),
    body,
    signoff: t("signoff"),
    support: t("supportLine"),
  });

  return sendTemplatedEmail({
    shipmentId: params.shipmentId,
    to: params.to,
    template: "delivered",
    subject,
    body: html,
    audience: "receiver",
  });
}

export async function sendStatusUpdateEmail(params: {
  shipmentId: string;
  to: string;
  recipientName: string;
  trackingId: string;
  newStatus: ShipmentStatus;
  locale?: string | null;
}): Promise<EmailResult> {
  const locale = normalizeLocale(params.locale);
  const [t, tStatus] = await Promise.all([
    getTranslations({ locale, namespace: "emails" }),
    getTranslations({ locale, namespace: "shipmentStatus" }),
  ]);
  const subject = t("statusUpdate.subject", { trackingId: params.trackingId });
  const html = wrapHtml({
    greeting: t("greeting", { name: escapeHtml(params.recipientName) }),
    body: t("statusUpdate.body", { newStatus: escapeHtml(tStatus(params.newStatus)) }),
    signoff: t("signoff"),
    support: t("supportLine"),
  });

  return sendTemplatedEmail({
    shipmentId: params.shipmentId,
    to: params.to,
    template: "shipment_update",
    subject,
    body: html,
    audience: "sender",
  });
}
