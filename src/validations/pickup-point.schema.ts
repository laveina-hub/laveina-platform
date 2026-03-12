import { z } from "zod";

export const createPickupPointSchema = z.object({
  name: z.string().min(2, "Name is required"),
  address: z.string().min(5, "Address is required"),
  postcode: z.string().min(4).max(10),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  working_hours: z.record(z.string()).optional(),
});

export const updatePickupPointSchema = createPickupPointSchema.partial().extend({
  is_active: z.boolean().optional(),
  is_open: z.boolean().optional(),
});

export type CreatePickupPointInput = z.infer<typeof createPickupPointSchema>;
export type UpdatePickupPointInput = z.infer<typeof updatePickupPointSchema>;
