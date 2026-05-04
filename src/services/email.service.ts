import { getTranslations } from "next-intl/server";

import {
  isChannelAllowed,
  isMandatoryTemplate,
  type NotificationTemplate,
} from "@/constants/notification-prefs";
import {
  escapeHtml,
  joinParagraphs,
  normalizeLocale,
  renderLink,
  wrapHtml,
} from "@/lib/email/rendering";
import { getResendConfig, sendResendEmail } from "@/lib/resend/client";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiResponse } from "@/types/api";

// A10 (client answer 2026-04-21): email is a first-class channel in the
// preferences matrix. Transactional sends go through Resend via
// `@/lib/resend/client`; auth emails are handled separately by Supabase's
// custom-SMTP config (also Resend). The `notifications_log` table is
// WhatsApp-shaped (NOT NULL recipient_phone, gallabox_message_id), so we
// intentionally skip DB logging for email until a migration generalises it.
//
// Per-shipment template senders live in `email-templates.service.ts` — this
// file keeps only the core dispatcher, the prefs gate, and the standalone
// support-reply sender (which isn't part of the A10 matrix).
//
// Dev fallback: if `RESEND_API_KEY` / `RESEND_FROM_EMAIL` aren't set (e.g. on
// a contributor's local machine) `dispatchEmail` logs the payload and returns
// a synthetic id so the booking flow stays runnable.

export type EmailAudience = "sender" | "receiver";

export type EmailResult = ApiResponse<{ messageId: string }>;

type EmailInput = {
  shipmentId: string;
  to: string;
  template: NotificationTemplate;
  subject: string;
  body: string;
  /**
   * Receivers don't have accounts, so receiver-audience emails bypass the
   * prefs gate. Defaults to "sender".
   */
  audience?: EmailAudience;
};

function skippedByPrefs(template: NotificationTemplate): EmailResult {
  return {
    data: { messageId: `skipped:prefs:email:${template}` },
    error: null,
  };
}

/**
 * Resolves the shipment's customer and checks whether they allow the given
 * email template to fire. Defaults to "allowed" on infra errors so we over-
 * notify rather than silently drop messages the customer wanted.
 */
async function isEmailAllowedForShipment(
  shipmentId: string,
  template: NotificationTemplate
): Promise<boolean> {
  if (isMandatoryTemplate(template)) return true;

  try {
    const supabase = createAdminClient();
    const { data: shipment } = await supabase
      .from("shipments")
      .select("customer_id")
      .eq("id", shipmentId)
      .maybeSingle();

    if (!shipment?.customer_id) return true;

    const { data: prefsRow } = await supabase
      .from("notification_preferences")
      .select("prefs")
      .eq("customer_id", shipment.customer_id)
      .maybeSingle();

    return isChannelAllowed(prefsRow?.prefs, template, "email");
  } catch (err) {
    console.error("email prefs gate failed, defaulting to allow:", err);
    return true;
  }
}

/**
 * Sends through Resend when configured; falls back to a console-log stub in
 * local/dev environments where the API key is absent. Returns the provider's
 * message id (or a synthetic `stub-email-…` id for the dev fallback).
 */
async function dispatchEmail(input: EmailInput): Promise<string> {
  const config = getResendConfig();

  if (!config) {
    const id = `stub-email-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    console.info("[email stub — Resend not configured]", {
      id,
      shipmentId: input.shipmentId,
      to: input.to,
      template: input.template,
      subject: input.subject,
    });
    return id;
  }

  const { id } = await sendResendEmail({
    to: input.to,
    subject: input.subject,
    html: input.body,
  });
  return id;
}

/**
 * Sends a templated email through Resend (or the dev stub), honoring the
 * customer's A10 email preference for sender-audience messages. Receiver-
 * audience mail fires unconditionally (no account → no prefs).
 *
 * `body` is treated as HTML by the Resend dispatcher — escape any user-
 * supplied strings before composing it.
 */
export async function sendTemplatedEmail(input: EmailInput): Promise<EmailResult> {
  const audience: EmailAudience = input.audience ?? "sender";

  if (audience === "sender") {
    const allowed = await isEmailAllowedForShipment(input.shipmentId, input.template);
    if (!allowed) return skippedByPrefs(input.template);
  }

  try {
    const messageId = await dispatchEmail(input);
    return { data: { messageId }, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send email";
    return { data: null, error: { message, status: 500 } };
  }
}

/**
 * Soft-touch notice fired when someone tries to register with an email that
 * already has an account. The registration form returns the same generic
 * "check your inbox" success in both branches (anti-enumeration), so this
 * email is the channel where existing users actually learn what happened —
 * with a login link and a password-reset link in case they forgot.
 *
 * Bypasses the A10 prefs matrix on purpose: this is a security/account
 * notice, not a marketing or shipment broadcast, so opting out doesn't apply.
 */
export async function sendDuplicateRegistrationNotice(params: {
  to: string;
  loginUrl: string;
  resetPasswordUrl: string;
  locale?: string | null;
}): Promise<EmailResult> {
  const t = await getTranslations({ locale: normalizeLocale(params.locale), namespace: "emails" });
  const subject = t("duplicateRegistration.subject");
  const html = wrapHtml({
    greeting: t("duplicateRegistration.greeting"),
    body: joinParagraphs(
      t("duplicateRegistration.body"),
      `${renderLink(params.loginUrl, t("duplicateRegistration.loginCta"))} · ${renderLink(params.resetPasswordUrl, t("duplicateRegistration.resetCta"))}`,
      t("duplicateRegistration.ignoreNote")
    ),
    signoff: t("signoff"),
    support: t("supportLine"),
  });

  try {
    const config = getResendConfig();
    if (!config) {
      const id = `stub-email-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      console.info("[email stub — Resend not configured]", {
        id,
        to: params.to,
        template: "duplicate_registration",
        subject,
      });
      return { data: { messageId: id }, error: null };
    }
    const { id } = await sendResendEmail({ to: params.to, subject, html });
    return { data: { messageId: id }, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send email";
    return { data: null, error: { message, status: 500 } };
  }
}

/**
 * Notifies the customer that an admin has replied to their support ticket.
 * Bypasses the A10 prefs matrix on purpose — support replies are transactional
 * responses to customer-initiated tickets, not broadcasts, so opting out
 * doesn't apply. Dispatches straight through Resend (or the dev stub).
 */
export async function sendSupportReplyEmail(params: {
  to: string;
  recipientName: string;
  ticketSubject: string;
  locale?: string | null;
}): Promise<EmailResult> {
  const t = await getTranslations({ locale: normalizeLocale(params.locale), namespace: "emails" });
  const subject = t("supportReply.subject", { subject: params.ticketSubject });
  const html = wrapHtml({
    greeting: t("greeting", { name: escapeHtml(params.recipientName) }),
    body: t("supportReply.body"),
    signoff: t("signoff"),
    support: t("supportLine"),
  });

  try {
    const config = getResendConfig();
    if (!config) {
      const id = `stub-email-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      console.info("[email stub — Resend not configured]", {
        id,
        to: params.to,
        template: "support_reply",
        subject,
      });
      return { data: { messageId: id }, error: null };
    }
    const { id } = await sendResendEmail({ to: params.to, subject, html });
    return { data: { messageId: id }, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send email";
    return { data: null, error: { message, status: 500 } };
  }
}
