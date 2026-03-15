import { createClient } from "@/lib/supabase/server";
import type { ApiResponse } from "@/types/api";
import type { ZoneType } from "@/types/enums";
import type {
  PricingRule,
  PricingRuleInsert,
  PricingRuleUpdate,
  PriceCalculationInput,
  PriceCalculationResult,
} from "@/types/pricing";
import {
  createPricingRuleSchema,
  updatePricingRuleSchema,
  type CreatePricingRuleInput,
  type UpdatePricingRuleInput,
} from "@/validations/pricing.schema";

export async function calculatePrice(
  origin_postcode: string,
  destination_postcode: string,
  weight_kg: number
): Promise<ApiResponse<PriceCalculationResult>> {
  const supabase = await createClient();

  throw new Error("Not implemented");
}

export async function getZoneByPostcode(postcode: string): Promise<ApiResponse<ZoneType>> {
  const supabase = await createClient();

  throw new Error("Not implemented");
}

export async function listPricingRules(
  filters: {
    origin_zone?: ZoneType;
    destination_zone?: ZoneType;
    is_active?: boolean;
  } = {}
): Promise<ApiResponse<PricingRule[]>> {
  const supabase = await createClient();

  throw new Error("Not implemented");
}

export async function createPricingRule(
  input: CreatePricingRuleInput
): Promise<ApiResponse<PricingRule>> {
  const supabase = await createClient();

  throw new Error("Not implemented");
}

export async function updatePricingRule(
  ruleId: string,
  input: UpdatePricingRuleInput
): Promise<ApiResponse<PricingRule>> {
  const supabase = await createClient();

  throw new Error("Not implemented");
}
