import { z } from "zod";

export const bookingStepContactSchema = z.object({
  sender_name: z.string().min(2, "validation.nameMin"),
  sender_phone: z.string().regex(/^\+?[\d\s\-]{9,15}$/, "validation.phoneInvalid"),
  receiver_name: z.string().min(2, "validation.nameMin"),
  receiver_phone: z.string().regex(/^\+?[\d\s\-]{9,15}$/, "validation.phoneInvalid"),
});

export const bookingStepOriginSchema = z.object({
  origin_postcode: z.string().regex(/^[0-9]{5}$/, "validation.postcodeInvalid"),
  origin_pickup_point_id: z.string().uuid("validation.pickupPointRequired"),
});

export const bookingStepDestinationSchema = z.object({
  destination_postcode: z.string().regex(/^[0-9]{5}$/, "validation.postcodeInvalid"),
  destination_pickup_point_id: z.string().uuid("validation.pickupPointRequired"),
});

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

export const bookingStepParcelSchema = z.object({
  parcels: z.array(parcelItemSchema).min(1, "validation.atLeastOneParcel"),
});

export const bookingStepSpeedSchema = z.object({
  delivery_speed: z.enum(["standard", "express"]),
});

// Server-side validation for checkout — prices are always recalculated
export const createCheckoutSchema = z.object({
  sender_name: z.string().min(2),
  sender_phone: z.string().regex(/^\+?[\d\s\-]{9,15}$/),
  receiver_name: z.string().min(2),
  receiver_phone: z.string().regex(/^\+?[\d\s\-]{9,15}$/),
  origin_postcode: z.string().regex(/^[0-9]{5}$/),
  origin_pickup_point_id: z.string().uuid(),
  destination_postcode: z.string().regex(/^[0-9]{5}$/),
  destination_pickup_point_id: z.string().uuid(),
  parcels: z
    .array(
      z.object({
        parcel_size: z.enum(["small", "medium", "large", "extra_large", "xxl"]),
        weight_kg: z.number().positive().max(25),
        insurance_option_id: z.string().uuid().nullable(),
      })
    )
    .min(1),
  delivery_speed: z.enum(["standard", "express"]),
});

export type ParcelItemInput = z.infer<typeof parcelItemSchema>;
export type BookingStepContactInput = z.infer<typeof bookingStepContactSchema>;
export type BookingStepOriginInput = z.infer<typeof bookingStepOriginSchema>;
export type BookingStepDestinationInput = z.infer<typeof bookingStepDestinationSchema>;
export type BookingStepParcelInput = z.infer<typeof bookingStepParcelSchema>;
export type BookingStepSpeedInput = z.infer<typeof bookingStepSpeedSchema>;
export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;
