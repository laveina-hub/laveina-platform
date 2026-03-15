import { calculateShipmentPrice } from "@/lib/pricing/calculator";
import { createClient } from "@/lib/supabase/server";
import type { ApiResponse } from "@/types/api";
import type { ZoneType } from "@/types/enums";
import type {
  PricingRule,
  PricingRuleInsert,
  PricingRuleUpdate,
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

  // Look up zones for postcodes
  const { data: originPostcode } = await supabase
    .from("postcodes")
    .select("zone")
    .eq("code", origin_postcode)
    .single();

  const { data: destPostcode } = await supabase
    .from("postcodes")
    .select("zone")
    .eq("code", destination_postcode)
    .single();

  if (!originPostcode || !destPostcode) {
    return {
      data: null,
      error: { message: "Invalid postcode", code: "INVALID_POSTCODE", status: 400 },
    };
  }

  const originZone = originPostcode.zone as ZoneType;
  const destZone = destPostcode.zone as ZoneType;

  // Fetch pricing rules for this zone combination
  const { data: rules, error } = await supabase
    .from("pricing_rules")
    .select("*")
    .eq("origin_zone", originZone)
    .eq("destination_zone", destZone)
    .eq("is_active", true);

  if (error || !rules?.length) {
    return {
      data: null,
      error: {
        message: `No pricing rules found for route ${originZone} -> ${destZone}`,
        code: "NO_PRICING_RULES",
        status: 404,
      },
    };
  }

  try {
    const result = calculateShipmentPrice(originZone, destZone, weight_kg, rules);
    return { data: result, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Price calculation failed";
    return { data: null, error: { message, status: 400 } };
  }
}

export async function getZoneByPostcode(postcode: string): Promise<ApiResponse<ZoneType>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("postcodes")
    .select("zone")
    .eq("code", postcode)
    .single();

  if (error || !data) {
    return {
      data: null,
      error: { message: "Postcode not found", code: "NOT_FOUND", status: 404 },
    };
  }

  return { data: data.zone as ZoneType, error: null };
}

export async function listPricingRules(
  filters: {
    origin_zone?: ZoneType;
    destination_zone?: ZoneType;
    is_active?: boolean;
  } = {}
): Promise<ApiResponse<PricingRule[]>> {
  const supabase = await createClient();

  let query = supabase.from("pricing_rules").select("*").order("created_at", { ascending: false });

  if (filters.origin_zone) query = query.eq("origin_zone", filters.origin_zone);
  if (filters.destination_zone) query = query.eq("destination_zone", filters.destination_zone);
  if (filters.is_active !== undefined) query = query.eq("is_active", filters.is_active);

  const { data, error } = await query;

  if (error) {
    return { data: null, error: { message: error.message, status: 500 } };
  }

  return { data: data ?? [], error: null };
}

export async function createPricingRule(
  input: CreatePricingRuleInput
): Promise<ApiResponse<PricingRule>> {
  const parsed = createPricingRuleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      data: null,
      error: { message: parsed.error.issues[0].message, code: "VALIDATION_ERROR", status: 400 },
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pricing_rules")
    .insert(parsed.data as PricingRuleInsert)
    .select()
    .single();

  if (error) {
    return { data: null, error: { message: error.message, status: 500 } };
  }

  return { data, error: null };
}

export async function updatePricingRule(
  ruleId: string,
  input: UpdatePricingRuleInput
): Promise<ApiResponse<PricingRule>> {
  const parsed = updatePricingRuleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      data: null,
      error: { message: parsed.error.issues[0].message, code: "VALIDATION_ERROR", status: 400 },
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pricing_rules")
    .update(parsed.data as PricingRuleUpdate)
    .eq("id", ruleId)
    .select()
    .single();

  if (error) {
    return { data: null, error: { message: error.message, status: 500 } };
  }

  return { data, error: null };
}
