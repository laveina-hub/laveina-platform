import { z } from "zod";

// ─── Step 1: Contact info ─────────────────────────────────────────────────────
// Sender and receiver in one card. Phone collected here (not at registration).

export const bookingStepContactSchema = z.object({
  sender_name: z.string().min(2, "validation.nameMin"),
  sender_phone: z.string().regex(/^\+?[\d\s\-]{9,15}$/, "validation.phoneInvalid"),
  receiver_name: z.string().min(2, "validation.nameMin"),
  receiver_phone: z.string().regex(/^\+?[\d\s\-]{9,15}$/, "validation.phoneInvalid"),
});

// ─── Step 2: Origin location ──────────────────────────────────────────────────
// Customer enters postcode → system shows available shops → customer selects one.

export const bookingStepOriginSchema = z.object({
  origin_postcode: z.string().regex(/^[0-9]{5}$/, "validation.postcodeInvalid"),
  origin_pickup_point_id: z.string().uuid("validation.pickupPointRequired"),
});

// ─── Step 3: Destination location ────────────────────────────────────────────

export const bookingStepDestinationSchema = z.object({
  destination_postcode: z.string().regex(/^[0-9]{5}$/, "validation.postcodeInvalid"),
  destination_pickup_point_id: z.string().uuid("validation.pickupPointRequired"),
});

// ─── Single parcel item (used in Step 4 form for each parcel) ────────────────

export const parcelItemSchema = z.object({
  parcel_size: z.enum(["small", "medium", "large", "extra_large", "xxl"], {
    errorMap: () => ({ message: "validation.parcelSizeRequired" }),
  }),
  weight_kg: z
    .number({ invalid_type_error: "validation.weightRequired" })
    .positive("validation.weightPositive")
    .max(25, "validation.weightMax"),
  insurance_option_id: z.string().uuid("validation.required").nullable(),
});

// ─── Step 4: Parcel details ───────────────────────────────────────────────────
// Supports multiple parcels per booking. Each parcel gets its own tracking ID.

export const bookingStepParcelSchema = z.object({
  parcels: z.array(parcelItemSchema).min(1, "validation.atLeastOneParcel"),
});

// ─── Step 5: Delivery speed ───────────────────────────────────────────────────

export const bookingStepSpeedSchema = z.object({
  delivery_speed: z.enum(["standard", "express"]),
});

// ─── Full checkout payload ────────────────────────────────────────────────────
// Validated server-side by POST /api/shipments/create-checkout before the
// price is recalculated and the Stripe session is created.
// Client price is NEVER trusted — server always recalculates from this input.

export const createCheckoutSchema = z.object({
  // Contact
  sender_name: z.string().min(2),
  sender_phone: z.string().regex(/^\+?[\d\s\-]{9,15}$/),
  receiver_name: z.string().min(2),
  receiver_phone: z.string().regex(/^\+?[\d\s\-]{9,15}$/),
  // Origin
  origin_postcode: z.string().regex(/^[0-9]{5}$/),
  origin_pickup_point_id: z.string().uuid(),
  // Destination
  destination_postcode: z.string().regex(/^[0-9]{5}$/),
  destination_pickup_point_id: z.string().uuid(),
  // Parcels (one or more)
  parcels: z
    .array(
      z.object({
        parcel_size: z.enum(["small", "medium", "large", "extra_large", "xxl"]),
        weight_kg: z.number().positive().max(25),
        insurance_option_id: z.string().uuid().nullable(),
      })
    )
    .min(1),
  // Speed (shared across all parcels)
  delivery_speed: z.enum(["standard", "express"]),
});

export type ParcelItemInput = z.infer<typeof parcelItemSchema>;
export type BookingStepContactInput = z.infer<typeof bookingStepContactSchema>;
export type BookingStepOriginInput = z.infer<typeof bookingStepOriginSchema>;
export type BookingStepDestinationInput = z.infer<typeof bookingStepDestinationSchema>;
export type BookingStepParcelInput = z.infer<typeof bookingStepParcelSchema>;
export type BookingStepSpeedInput = z.infer<typeof bookingStepSpeedSchema>;
export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;
