import { z } from "zod";

export const batchDispatchSchema = z.object({
  shipmentIds: z
    .array(z.string().uuid())
    .min(1, "At least one shipment ID is required")
    .max(100, "Maximum 100 shipments per batch"),
});

export type BatchDispatchInput = z.infer<typeof batchDispatchSchema>;

const settingsValueSchema = z.record(z.string(), z.string());

const insuranceOptionUpdateSchema = z.object({
  id: z.string().uuid(),
  coverage_amount_cents: z.number().int().min(0),
  surcharge_cents: z.number().int().min(0),
  is_active: z.boolean(),
});

export const adminSettingsUpdateSchema = z.object({
  settings: settingsValueSchema.optional(),
  insuranceOptions: z.array(insuranceOptionUpdateSchema).optional(),
});

export type AdminSettingsUpdateInput = z.infer<typeof adminSettingsUpdateSchema>;

export const notificationQuerySchema = z.object({
  status: z.enum(["unread", "all"]).default("all"),
  priority: z.enum(["low", "normal", "high", "critical"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const notificationPatchSchema = z.object({
  status: z.literal("read"),
});
