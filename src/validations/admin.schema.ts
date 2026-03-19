import { z } from "zod";

// ─── Batch Dispatch ──────────────────────────────────────────────────────────

export const batchDispatchSchema = z.object({
  shipmentIds: z
    .array(z.string().uuid())
    .min(1, "At least one shipment ID is required")
    .max(100, "Maximum 100 shipments per batch"),
});

export type BatchDispatchInput = z.infer<typeof batchDispatchSchema>;

// ─── Admin Settings Update ───────────────────────────────────────────────────

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
