import { z } from "zod";

const zoneEnum = z.enum(["A", "B", "C", "D"]);

export const createPricingRuleSchema = z.object({
  origin_zone: zoneEnum,
  destination_zone: zoneEnum,
  min_weight_kg: z.number().min(0),
  max_weight_kg: z.number().positive(),
  price_cents: z.number().positive("Price must be greater than 0"),
  is_active: z.boolean().default(true),
});

export const updatePricingRuleSchema = createPricingRuleSchema.partial();

export type CreatePricingRuleInput = z.infer<typeof createPricingRuleSchema>;
export type UpdatePricingRuleInput = z.infer<typeof updatePricingRuleSchema>;
