import { z } from "zod";

import { routing } from "@/i18n/routing";
import { parcelPresetSlugSchema } from "@/validations/shipment.schema";

// Shape of the JSON persisted in `pending_bookings.booking_data` for M2.
// Writer: /api/shipments/create-checkout. Reader: Stripe webhook.
// The `version: "m2"` tag lets the webhook reject legacy payloads up-front.
//
// Per-parcel `price_cents` is the full per-parcel total paid (shipping +
// insurance + 21% VAT) per Q15.2 — matches Stripe's unit_amount for the line
// and is copied verbatim into `shipments.price_cents`.
// `insurance_cost_cents` is the A3 tier cost for the declared value on that
// parcel (ex-VAT, already included in `price_cents` via the Q15.2 formula);
// `declared_value_cents` is what the customer entered.

export const pendingBookingV2Schema = z.object({
  version: z.literal("m2"),
  delivery_mode: z.enum(["internal", "sendcloud"]),
  actual_speed: z.enum(["standard", "express", "next_day"]),
  /**
   * Locale captured at checkout so transactional emails sent after the webhook
   * fires match the language the customer was browsing in. Optional for
   * backwards-compat with already-persisted pre-locale payloads; readers
   * should fall back to `routing.defaultLocale`.
   */
  locale: z.enum(routing.locales).optional(),

  sender: z.object({
    first_name: z.string().min(1),
    last_name: z.string().min(1),
    phone: z.string().min(1),
    whatsapp: z.string().nullable(),
    email: z.string().email(),
  }),
  receiver: z.object({
    first_name: z.string().min(1),
    last_name: z.string().min(1),
    phone: z.string().min(1),
    whatsapp: z.string().nullable(),
    email: z.string().email(),
  }),

  origin: z.object({
    postcode: z.string().regex(/^[0-9]{5}$/),
    pickup_point_id: z.string().uuid(),
  }),
  destination: z.object({
    postcode: z.string().regex(/^[0-9]{5}$/),
    pickup_point_id: z.string().uuid(),
  }),

  parcels: z
    .array(
      z.object({
        preset_slug: parcelPresetSlugSchema,
        weight_kg: z.number().positive(),
        length_cm: z.number().positive(),
        width_cm: z.number().positive(),
        height_cm: z.number().positive(),
        declared_value_cents: z.number().int().nonnegative(),
        insurance_cost_cents: z.number().int().nonnegative(),
        /** Full per-parcel total paid (shipping + insurance + VAT) per Q15.2. */
        price_cents: z.number().int().positive(),
        carrier_rate_cents: z.number().int().nonnegative().nullable(),
        margin_percent: z.number().nonnegative().nullable(),
        shipping_method_id: z.number().nullable(),
        /** v3 carrier selector. Null on BCN; required at dispatch for SendCloud. */
        shipping_option_code: z.string().nullable().optional(),
      })
    )
    .min(1)
    .max(5),
});

export type PendingBookingV2 = z.infer<typeof pendingBookingV2Schema>;
