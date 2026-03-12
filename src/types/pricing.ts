import type { Database } from "./database.types";

export type PricingRule = Database["public"]["Tables"]["pricing_rules"]["Row"];
export type PricingRuleInsert = Database["public"]["Tables"]["pricing_rules"]["Insert"];
export type PricingRuleUpdate = Database["public"]["Tables"]["pricing_rules"]["Update"];

export type WeightTier = {
  min_weight_kg: number;
  max_weight_kg: number;
  price_cents: number;
};

export type PriceCalculationInput = {
  origin_postcode: string;
  destination_postcode: string;
  weight_kg: number;
};

export type PriceCalculationResult = {
  origin_zone: string;
  destination_zone: string;
  weight_tier: WeightTier;
  total_cents: number;
};
