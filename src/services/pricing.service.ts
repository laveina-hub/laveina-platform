import { createClient } from "@/lib/supabase/server";
import type { ApiResponse } from "@/types/api";
import type {
  PricingRule,
  PricingRuleInsert,
  PricingRuleUpdate,
  PriceCalculationInput,
  PriceCalculationResult,
} from "@/types/pricing";
import type { ZoneType } from "@/types/enums";
import {
  createPricingRuleSchema,
  updatePricingRuleSchema,
  type CreatePricingRuleInput,
  type UpdatePricingRuleInput,
} from "@/validations/pricing.schema";

// ---------------------------------------------------------------------------
// calculatePrice
// ---------------------------------------------------------------------------

/**
 * Calculates the shipping price for a parcel given origin/destination postcodes
 * and weight.
 *
 * Steps:
 *  1. Resolve each postcode to a zone via `getZoneByPostcode`
 *  2. Look up the matching pricing_rule for (origin_zone, destination_zone, weight)
 *  3. Return the price breakdown
 */
export async function calculatePrice(
  origin_postcode: string,
  destination_postcode: string,
  weight_kg: number,
): Promise<ApiResponse<PriceCalculationResult>> {
  // TODO: const originZone = await getZoneByPostcode(origin_postcode)
  // TODO: const destZone   = await getZoneByPostcode(destination_postcode)
  // TODO: Query pricing_rules where origin_zone, destination_zone match
  //       and weight_kg is between min_weight_kg and max_weight_kg
  //       and is_active = true
  // TODO: Return 404 ApiError if no matching rule found
  // TODO: Return PriceCalculationResult

  const supabase = await createClient();

  throw new Error("Not implemented");
}

// ---------------------------------------------------------------------------
// getZoneByPostcode
// ---------------------------------------------------------------------------

/**
 * Looks up the zone (A/B/C/D) for a given postcode from the `postcodes` table.
 */
export async function getZoneByPostcode(
  postcode: string,
): Promise<ApiResponse<ZoneType>> {
  // TODO: Query postcodes table where code = postcode
  // TODO: Return 404 ApiError if postcode not found
  // TODO: Return the zone value

  const supabase = await createClient();

  throw new Error("Not implemented");
}

// ---------------------------------------------------------------------------
// listPricingRules
// ---------------------------------------------------------------------------

/**
 * Returns all pricing rules, optionally filtered by zone or active status.
 */
export async function listPricingRules(
  filters: {
    origin_zone?: ZoneType;
    destination_zone?: ZoneType;
    is_active?: boolean;
  } = {},
): Promise<ApiResponse<PricingRule[]>> {
  // TODO: Build query with optional .eq() filters
  // TODO: Order by origin_zone, destination_zone, min_weight_kg
  // TODO: Return rows

  const supabase = await createClient();

  throw new Error("Not implemented");
}

// ---------------------------------------------------------------------------
// createPricingRule
// ---------------------------------------------------------------------------

/**
 * Creates a new pricing rule after validating with Zod schema.
 */
export async function createPricingRule(
  input: CreatePricingRuleInput,
): Promise<ApiResponse<PricingRule>> {
  // TODO: Validate input with createPricingRuleSchema.parse(input)
  // TODO: Insert row into pricing_rules
  // TODO: Return the created rule

  const supabase = await createClient();

  throw new Error("Not implemented");
}

// ---------------------------------------------------------------------------
// updatePricingRule
// ---------------------------------------------------------------------------

/**
 * Updates an existing pricing rule by ID.
 */
export async function updatePricingRule(
  ruleId: string,
  input: UpdatePricingRuleInput,
): Promise<ApiResponse<PricingRule>> {
  // TODO: Validate input with updatePricingRuleSchema.parse(input)
  // TODO: Update pricing_rules row where id = ruleId
  // TODO: Return 404 ApiError if not found
  // TODO: Return the updated rule

  const supabase = await createClient();

  throw new Error("Not implemented");
}
