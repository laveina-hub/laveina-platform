import type { ZoneType } from "@/types/enums";
import type { PriceCalculationResult, WeightTier } from "@/types/pricing";

type PricingRule = {
  origin_zone: ZoneType;
  destination_zone: ZoneType;
  min_weight_kg: number;
  max_weight_kg: number;
  price_cents: number;
  is_active: boolean;
};

export function calculateShipmentPrice(
  originZone: ZoneType,
  destinationZone: ZoneType,
  weightKg: number,
  rules: PricingRule[]
): PriceCalculationResult {
  if (weightKg <= 0) {
    throw new Error("Weight must be greater than 0");
  }

  const matchingRules = rules.filter(
    (rule) =>
      rule.is_active && rule.origin_zone === originZone && rule.destination_zone === destinationZone
  );

  if (matchingRules.length === 0) {
    throw new Error(`No pricing rules found for route ${originZone} -> ${destinationZone}`);
  }

  const applicableRule = matchingRules.find(
    (rule) => weightKg >= rule.min_weight_kg && weightKg <= rule.max_weight_kg
  );

  if (!applicableRule) {
    const maxWeight = Math.max(...matchingRules.map((r) => r.max_weight_kg));
    throw new Error(
      `No pricing tier covers ${weightKg}kg for route ${originZone} -> ${destinationZone}. ` +
        `Maximum supported weight is ${maxWeight}kg.`
    );
  }

  const weightTier: WeightTier = {
    min_weight_kg: applicableRule.min_weight_kg,
    max_weight_kg: applicableRule.max_weight_kg,
    price_cents: applicableRule.price_cents,
  };

  return {
    origin_zone: originZone,
    destination_zone: destinationZone,
    weight_tier: weightTier,
    total_cents: applicableRule.price_cents,
  };
}
