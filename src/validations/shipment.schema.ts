import { z } from "zod";

import {
  MAX_LONGEST_SIDE_CM,
  MAX_TOTAL_DIMENSIONS_CM,
  MAX_WEIGHT_KG,
} from "@/constants/parcel-sizes";

// Spanish mobile / landline. Accepts either "+34 XXX XXX XXX" (with/without
// spaces or dashes) or a bare 9-digit local number. Normalization to E.164
// happens at the service layer.
const SPANISH_PHONE_REGEX = /^(?:\+34[\s-]?)?[6-9]\d{2}[\s-]?\d{3}[\s-]?\d{3}$/;
// Q18.3 — WhatsApp accepts any international number (tourists, expatriates
// whose WhatsApp is tied to a non-ES mobile). E.164 constrains to + followed
// by a country code (1–9) and 7–14 additional digits, total 8–15 digits.
// We tolerate spaces/dashes in the input and strip them before checking.
const INTERNATIONAL_PHONE_REGEX = /^\+[1-9]\d{7,14}$/;

const personNameField = z.string().min(2, "validation.nameMin").max(60, "validation.nameMax");

// Q18.3 — WhatsApp validator accepts either a Spanish number (when the
// checkbox copies phone → whatsapp) OR any international E.164. Input is
// stripped of spaces/dashes, then either regex is allowed to match.
const internationalPhoneField = z.preprocess(
  (val) => (typeof val === "string" ? val.replace(/[\s-]/g, "") : val),
  z
    .string()
    .refine(
      (v) => SPANISH_PHONE_REGEX.test(v) || INTERNATIONAL_PHONE_REGEX.test(v),
      "validation.whatsappInvalid"
    )
);

// DEV-ONLY relaxation — by default `receiver_phone` / `sender_phone` must be
// a Spanish number (see business rule: M2 launches in Spain only). During
// local development, testers without a Spanish SIM need to enter a foreign
// WhatsApp number (e.g. +386 for Slovenia, +1 for US) so they can verify the
// end-to-end Gallabox delivery against their own device.
//
// Next.js replaces `process.env.NODE_ENV` at build time in both server and
// client bundles, so this gate is effectively a compile-time constant:
//   - `next dev`                     → NODE_ENV = "development" → relaxed
//   - `next build && next start`     → NODE_ENV = "production"  → strict
//   - `next build` preview deploys   → NODE_ENV = "production"  → strict
//   - `vitest` / CI                  → NODE_ENV = "test"        → strict
//
// Only `development` flips to the permissive validator. `test` stays strict
// so the existing schema tests (which assert non-Spanish numbers are
// rejected) continue to protect the production contract. Staging and
// production always enforce the Spanish-only regex — there's no runtime
// toggle, nothing a real customer can flip.
const phoneField =
  process.env.NODE_ENV === "development"
    ? internationalPhoneField
    : z.string().regex(SPANISH_PHONE_REGEX, "validation.phoneInvalid");

const emailField = z.string().email("validation.emailInvalid");

const dimensionField = z
  .number({ invalid_type_error: "validation.dimensionRequired" })
  .min(1, "validation.dimensionMin")
  .max(MAX_LONGEST_SIDE_CM, "validation.longestSideExceeded");

export const parcelPresetSlugSchema = z.enum(["mini", "small", "medium", "large"]);

// A parcel is either a preset pick (slug + auto-filled dims on the server) or
// a custom-size entry (dimensions + weight). The server resolves presets
// against the `parcel_presets` table and applies the dimension check for
// custom-size parcels.
export const parcelItemSchema = z
  .object({
    preset_slug: parcelPresetSlugSchema.nullable(),
    length_cm: dimensionField.optional(),
    width_cm: dimensionField.optional(),
    height_cm: dimensionField.optional(),
    weight_kg: z
      .number({ invalid_type_error: "validation.weightRequired" })
      .min(0.1, "validation.weightMin")
      .max(MAX_WEIGHT_KG, "validation.weightMax"),
    declared_value_cents: z
      .number()
      .int()
      .min(0)
      .max(500000, "validation.declaredValueMax")
      .optional(),
    wants_insurance: z.boolean().default(false),
  })
  .refine(
    (data) =>
      data.preset_slug !== null ||
      (data.length_cm !== undefined && data.width_cm !== undefined && data.height_cm !== undefined),
    { message: "validation.presetOrDimensionsRequired", path: ["preset_slug"] }
  )
  .refine(
    (data) => {
      if (
        data.length_cm === undefined ||
        data.width_cm === undefined ||
        data.height_cm === undefined
      ) {
        return true;
      }
      return data.length_cm + data.width_cm + data.height_cm <= MAX_TOTAL_DIMENSIONS_CM;
    },
    { message: "validation.totalDimensionsExceeded", path: ["length_cm"] }
  );

// Single source of truth for sender / receiver contact fields. Both the Step 3
// UI form and the server-side `createCheckoutSchema` spread these definitions
// so renaming a field, tightening a validator, or adding a new contact field
// updates client and server in one place — no schema drift, no "the UI passed
// but the server rejected" gap on Pay click.
const senderContactFields = {
  sender_first_name: personNameField,
  sender_last_name: personNameField,
  sender_phone: phoneField,
  sender_whatsapp: internationalPhoneField,
  sender_email: emailField,
} as const;

const receiverContactFields = {
  receiver_first_name: personNameField,
  receiver_last_name: personNameField,
  receiver_phone: phoneField,
  receiver_whatsapp: internationalPhoneField,
  receiver_email: emailField,
} as const;

// M2 contact step — split names, Spanish phone, required WhatsApp + email.
// `sender_whatsapp_same_as_phone` drives the "also my WhatsApp" checkbox.
// When true, the service copies `*_phone` into `*_whatsapp`; otherwise the
// separate field is validated on its own.
export const bookingStepContactSchema = z
  .object({
    ...senderContactFields,
    sender_whatsapp: senderContactFields.sender_whatsapp.optional(),
    sender_whatsapp_same_as_phone: z.boolean().default(true),

    ...receiverContactFields,
    receiver_whatsapp: receiverContactFields.receiver_whatsapp.optional(),
    receiver_whatsapp_same_as_phone: z.boolean().default(true),
  })
  .refine((data) => data.sender_whatsapp_same_as_phone || !!data.sender_whatsapp, {
    message: "validation.whatsappRequired",
    path: ["sender_whatsapp"],
  })
  .refine((data) => data.receiver_whatsapp_same_as_phone || !!data.receiver_whatsapp, {
    message: "validation.whatsappRequired",
    path: ["receiver_whatsapp"],
  });

// Receiver-only subset used by Step 4 (the wizard sender auto-fills from the
// profile so only receiver fields are entered here). `whatsapp_same_as_phone`
// defaults true — the design hides the "also my WhatsApp" checkbox, and the
// M2 contract is to use the recipient's phone as their WhatsApp unless they
// explicitly override. Keep the full `bookingStepContactSchema` for server-side
// validation of the full submission.
export const bookingStepRecipientSchema = z.object({
  receiver_first_name: receiverContactFields.receiver_first_name,
  receiver_last_name: receiverContactFields.receiver_last_name,
  receiver_phone: receiverContactFields.receiver_phone,
  receiver_email: receiverContactFields.receiver_email,
});

// UI schema for the Step 3 recipient form (Q3.2 / Q3.3 / Q3.4).
// - Q3.2: split first/last name.
// - Q3.3: single phone + "also my WhatsApp" checkbox (defaults true). When
//   unchecked, `receiver_whatsapp` becomes required; the refine mirrors the
//   server schema at `bookingStepContactSchema`.
// - Q3.4: email required.
export const bookingStepRecipientUiSchema = z
  .object({
    ...receiverContactFields,
    receiver_whatsapp: receiverContactFields.receiver_whatsapp.optional().or(z.literal("")),
    receiver_whatsapp_same_as_phone: z.boolean().default(true),
  })
  .refine((data) => data.receiver_whatsapp_same_as_phone || !!data.receiver_whatsapp, {
    message: "validation.whatsappRequired",
    path: ["receiver_whatsapp"],
  });

export const bookingStepOriginSchema = z.object({
  origin_postcode: z.string().regex(/^[0-9]{5}$/, "validation.postcodeInvalid"),
  origin_pickup_point_id: z.string().uuid("validation.pickupPointRequired"),
});

export const bookingStepDestinationSchema = z.object({
  destination_postcode: z.string().regex(/^[0-9]{5}$/, "validation.postcodeInvalid"),
  destination_pickup_point_id: z.string().uuid("validation.pickupPointRequired"),
});

export const bookingStepParcelSchema = z.object({
  parcels: z.array(parcelItemSchema).min(1, "validation.atLeastOneParcel"),
});

export const deliverySpeedSchema = z.enum(["standard", "express", "next_day"]);

export const bookingStepSpeedSchema = z.object({
  delivery_speed: deliverySpeedSchema,
});

// Schema for POST /api/shipments/quote — returns per-parcel price options
// for both BCN (internal) and Rest-of-Spain (SendCloud) routes. Endpoint is
// public (no auth) because quotes are consumed by the booking wizard before
// the user reaches checkout. `declared_value_cents` is optional so the UI can
// fetch a shipping-only quote before the user opens the insurance section.
export const quoteRequestSchema = z.object({
  origin_postcode: z.string().regex(/^[0-9]{5}$/, "validation.postcodeInvalid"),
  destination_postcode: z.string().regex(/^[0-9]{5}$/, "validation.postcodeInvalid"),
  parcels: z.array(parcelItemSchema).min(1).max(5),
});

export type QuoteRequestInput = z.infer<typeof quoteRequestSchema>;

// Server-side validation for checkout — merged step 1–4 payload. Prices are
// always recalculated; this schema only guards shape + business rules.
// Receiver / sender field shapes come from the shared `*ContactFields`
// definitions above, so the Step 3 UI form and this server schema can never
// disagree on validators (length, regex, required).
export const createCheckoutSchema = z.object({
  ...senderContactFields,
  ...receiverContactFields,

  origin_postcode: z.string().regex(/^[0-9]{5}$/),
  origin_pickup_point_id: z.string().uuid(),
  destination_postcode: z.string().regex(/^[0-9]{5}$/),
  destination_pickup_point_id: z.string().uuid(),

  parcels: z.array(parcelItemSchema).min(1),
  delivery_speed: deliverySpeedSchema,
});

export type ParcelPresetSlugInput = z.infer<typeof parcelPresetSlugSchema>;
export type ParcelItemInput = z.infer<typeof parcelItemSchema>;
export type BookingStepContactInput = z.infer<typeof bookingStepContactSchema>;
export type BookingStepRecipientInput = z.infer<typeof bookingStepRecipientSchema>;
export type BookingStepRecipientUiInput = z.infer<typeof bookingStepRecipientUiSchema>;
export type BookingStepOriginInput = z.infer<typeof bookingStepOriginSchema>;
export type BookingStepDestinationInput = z.infer<typeof bookingStepDestinationSchema>;
export type BookingStepParcelInput = z.infer<typeof bookingStepParcelSchema>;
export type BookingStepSpeedInput = z.infer<typeof bookingStepSpeedSchema>;
export type DeliverySpeedInput = z.infer<typeof deliverySpeedSchema>;
export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;
