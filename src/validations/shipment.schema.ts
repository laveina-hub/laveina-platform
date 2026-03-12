import { z } from "zod";

export const bookingStepSenderSchema = z.object({
  sender_name: z.string().min(2, "Name is required"),
  sender_phone: z.string().min(9, "Valid phone number is required"),
  origin_postcode: z.string().min(4, "Postcode is required").max(10),
});

export const bookingStepReceiverSchema = z.object({
  receiver_name: z.string().min(2, "Name is required"),
  receiver_phone: z.string().min(9, "Valid phone number is required"),
  destination_postcode: z.string().min(4, "Postcode is required").max(10),
});

export const bookingStepPickupPointsSchema = z.object({
  origin_pickup_point_id: z.string().uuid("Please select an origin pickup point"),
  destination_pickup_point_id: z.string().uuid("Please select a destination pickup point"),
});

export const bookingStepParcelSchema = z.object({
  weight_kg: z.number().positive("Weight must be greater than 0").max(30, "Maximum weight is 30kg"),
});

export const createShipmentSchema = z.object({
  sender_name: z.string().min(2),
  sender_phone: z.string().min(9),
  receiver_name: z.string().min(2),
  receiver_phone: z.string().min(9),
  origin_pickup_point_id: z.string().uuid(),
  destination_pickup_point_id: z.string().uuid(),
  origin_postcode: z.string().min(4).max(10),
  destination_postcode: z.string().min(4).max(10),
  weight_kg: z.number().positive().max(30),
});

export type CreateShipmentInput = z.infer<typeof createShipmentSchema>;
