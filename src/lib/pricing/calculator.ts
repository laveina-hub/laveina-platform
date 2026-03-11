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

/**
 * Pure function to calculate the shipment price based on origin/destination zones,
 * parcel weight, and the set of pricing rules.
 *
 * Finds the matching active rule for the given zone pair and weight, then returns
 * the price breakdown. Throws if no matching rule is found.
 *
 * @param originZone - The origin zone (A, B, C, or D)
 * @param destinationZone - The destination zone (A, B, C, or D)
 * @param weightKg - The parcel weight in kilograms
 * @param rules - The full set of pricing rules to search through
 * @returns The price calculation result with zone info, weight tier, and total
 */
export function calculateShipmentPrice(
  originZone: ZoneType,
  destinationZone: ZoneType,
  weightKg: number,
  rules: PricingRule[],
): PriceCalculationResult {
  if (weightKg <= 0) {
    throw new Error("Weight must be greater than 0");
  }

  // Filter to active rules matching the zone pair
  const matchingRules = rules.filter(
    (rule) =>
      rule.is_active &&
      rule.origin_zone === originZone &&
      rule.destination_zone === destinationZone,
  );

  if (matchingRules.length === 0) {
    throw new Error(
      `No pricing rules found for route ${originZone} -> ${destinationZone}`,
    );
  }

  // Find the rule whose weight tier contains the given weight
  const applicableRule = matchingRules.find(
    (rule) => weightKg >= rule.min_weight_kg && weightKg <= rule.max_weight_kg,
  );

  if (!applicableRule) {
    // Find the highest available tier to provide a useful error message
    const maxWeight = Math.max(...matchingRules.map((r) => r.max_weight_kg));
    throw new Error(
      `No pricing tier covers ${weightKg}kg for route ${originZone} -> ${destinationZone}. ` +
        `Maximum supported weight is ${maxWeight}kg.`,
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
