"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { type ParcelPreset } from "@/constants/parcel-sizes";
import {
  useBookingStore,
  type DeliverySpeed,
  type RecipientFieldErrors,
  type SenderFieldErrors,
} from "@/hooks/use-booking-store";

// Encapsulates the Stripe Checkout submission for Step 4: builds the
// `/api/shipments/create-checkout` payload from the booking store, posts it,
// and full-page redirects to Stripe on success. Lives in its own hook so the
// `Step4Confirm.tsx` JSX file stays under the 250-line cap and the network
// flow can be unit-tested in isolation.

const RECIPIENT_FIELD_KEYS = [
  "receiver_first_name",
  "receiver_last_name",
  "receiver_phone",
  "receiver_whatsapp",
  "receiver_email",
] as const satisfies ReadonlyArray<keyof RecipientFieldErrors>;

const SENDER_FIELD_KEYS = [
  "sender_first_name",
  "sender_last_name",
  "sender_phone",
  "sender_whatsapp",
  "sender_email",
] as const satisfies ReadonlyArray<keyof SenderFieldErrors>;

// Zod's `.flatten()` shape for the body validator at the create-checkout
// route. `fieldErrors[key]` is an array of error message strings (translation
// keys); `formErrors` covers schema-level errors that aren't pinned to a
// single field.
type ValidationDetails = {
  fieldErrors?: Record<string, string[] | undefined>;
  formErrors?: string[];
};

function extractRecipientErrors(details: ValidationDetails): RecipientFieldErrors {
  const out: RecipientFieldErrors = {};
  for (const key of RECIPIENT_FIELD_KEYS) {
    const message = details.fieldErrors?.[key]?.[0];
    if (message) out[key] = message;
  }
  return out;
}

function extractSenderErrors(details: ValidationDetails): SenderFieldErrors {
  const out: SenderFieldErrors = {};
  for (const key of SENDER_FIELD_KEYS) {
    const message = details.fieldErrors?.[key]?.[0];
    if (message) out[key] = message;
  }
  return out;
}

type UseStep4CheckoutArgs = {
  presets: ParcelPreset[];
  speed: DeliverySpeed;
};

export function useStep4Checkout({ presets, speed }: UseStep4CheckoutArgs) {
  const t = useTranslations("booking");
  const locale = useLocale();
  const {
    parcels,
    origin,
    destination,
    sender,
    recipient,
    setStep,
    setPendingRecipientErrors,
    setPendingSenderErrors,
  } = useBookingStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(): Promise<void> {
    if (!sender || !recipient || !origin || !destination) return;
    setIsSubmitting(true);
    try {
      const payload = {
        sender_first_name: sender.firstName,
        sender_last_name: sender.lastName,
        sender_phone: sender.phone,
        sender_whatsapp: sender.whatsapp || sender.phone,
        sender_email: sender.email,

        receiver_first_name: recipient.firstName,
        receiver_last_name: recipient.lastName,
        receiver_phone: recipient.phone,
        receiver_whatsapp: recipient.whatsapp || recipient.phone,
        receiver_email: recipient.email,

        origin_postcode: origin.postcode,
        origin_pickup_point_id: origin.pickupPointId,
        destination_postcode: destination.postcode,
        destination_pickup_point_id: destination.pickupPointId,

        parcels: parcels.map((parcel) => {
          const preset = parcel.preset_slug
            ? presets.find((p) => p.slug === parcel.preset_slug)
            : null;
          return {
            preset_slug: parcel.preset_slug,
            weight_kg: parcel.weight_kg,
            length_cm: preset?.lengthCm ?? parcel.length_cm,
            width_cm: preset?.widthCm ?? parcel.width_cm,
            height_cm: preset?.heightCm ?? parcel.height_cm,
            declared_value_cents: parcel.declared_value_cents ?? 0,
            wants_insurance: parcel.wants_insurance ?? false,
          };
        }),
        delivery_speed: speed,
      };

      const res = await fetch("/api/shipments/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-locale": locale },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error("create-checkout failed:", body);

        // Server's Zod body validator failed. Extract field-level errors,
        // route the user back to Step 3 with the offending sender / recipient
        // inputs marked, and surface a targeted toast instead of the generic
        // "payment failed" — which would force them to hunt for the bad
        // field with no signal.
        if (res.status === 400 && body?.error === "invalid_body" && body?.details) {
          const details = body.details as ValidationDetails;
          const recipientErrors = extractRecipientErrors(details);
          const senderErrors = extractSenderErrors(details);
          const recipientHasErrors = Object.keys(recipientErrors).length > 0;
          const senderHasErrors = Object.keys(senderErrors).length > 0;

          if (recipientHasErrors || senderHasErrors) {
            if (recipientHasErrors) setPendingRecipientErrors(recipientErrors);
            if (senderHasErrors) setPendingSenderErrors(senderErrors);
            setStep(3);
            // Toast wording matches what's actually wrong:
            //   - sender only       → "review your sender details"
            //   - recipient only    → "review the recipient details"
            //   - both              → "review your contact details"
            // The combined case avoids saying "review the recipient" when
            // the user can also see a sender error highlighted on the page.
            const toastKey =
              senderHasErrors && recipientHasErrors
                ? "contactReviewRequired"
                : senderHasErrors
                  ? "senderReviewRequired"
                  : "recipientReviewRequired";
            toast.error(t(toastKey));
            setIsSubmitting(false);
            return;
          }
        }

        // Route blocked, Stripe/preset config errors, etc. — these aren't
        // fixable on Step 3 so a generic "couldn't start checkout" toast is
        // the right surface; the underlying code is logged for ops.
        toast.error(t("paymentFailed"));
        setIsSubmitting(false);
        return;
      }

      const json = await res.json();
      const url: string | undefined = json?.data?.url;
      if (!url) {
        toast.error(t("paymentFailed"));
        setIsSubmitting(false);
        return;
      }

      // Stripe hosted checkout — full-page redirect, no SPA nav.
      window.location.href = url;
    } catch (err) {
      console.error("create-checkout threw:", err);
      toast.error(t("paymentFailed"));
      setIsSubmitting(false);
    }
  }

  return { isSubmitting, submit };
}
