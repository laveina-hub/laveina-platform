import { z } from "zod";

// A5 (client answer 2026-04-21): customers can save pickup points with a
// label and mark one as default. The default appears as the auto-selected
// option in the Step 2 Origin & Destination dropdown.

const uuidSchema = z.string().uuid({ message: "validation.invalidId" });

export const createSavedAddressSchema = z.object({
  label: z.string().trim().min(1, "validation.labelRequired").max(64, "validation.labelTooLong"),
  pickup_point_id: uuidSchema,
  is_default: z.boolean().optional().default(false),
});

export const updateSavedAddressSchema = z
  .object({
    label: z.string().trim().min(1, "validation.labelRequired").max(64, "validation.labelTooLong"),
    pickup_point_id: uuidSchema,
    is_default: z.boolean(),
  })
  .partial()
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "validation.noFieldsToUpdate",
  });

export type CreateSavedAddressInput = z.infer<typeof createSavedAddressSchema>;
export type UpdateSavedAddressInput = z.infer<typeof updateSavedAddressSchema>;
