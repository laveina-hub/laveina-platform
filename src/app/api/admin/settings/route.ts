import { NextResponse, type NextRequest } from "next/server";

import { verifyAuth } from "@/lib/supabase/auth";
import { logAuditEvent } from "@/services/audit.service";
import { adminSettingsUpdateSchema } from "@/validations/admin.schema";

export async function GET() {
  const auth = await verifyAuth();
  if (auth.error) return auth.error;
  const { supabase, role } = auth;

  if (role !== "admin") {
    return NextResponse.json({ error: { message: "Forbidden", status: 403 } }, { status: 403 });
  }

  const [settingsResult, insuranceResult, parcelSizesResult] = await Promise.all([
    supabase.from("admin_settings").select("key, value"),
    supabase
      .from("insurance_options")
      .select(
        "id, coverage_amount_cents, surcharge_cents, is_active, display_order, created_at, updated_at"
      )
      .order("coverage_amount_cents"),
    supabase
      .from("parcel_size_config")
      .select("size, min_weight_kg, max_weight_kg, is_active, updated_at")
      .order("max_weight_kg"),
  ]);

  const settingsMap: Record<string, string> = {};
  for (const row of settingsResult.data ?? []) {
    settingsMap[row.key] = row.value;
  }

  return NextResponse.json({
    data: {
      settings: settingsMap,
      insuranceOptions: insuranceResult.data ?? [],
      parcelSizes: parcelSizesResult.data ?? [],
    },
  });
}

export async function PUT(request: NextRequest) {
  const auth = await verifyAuth();
  if (auth.error) return auth.error;
  const { supabase, role: putRole } = auth;

  if (putRole !== "admin") {
    return NextResponse.json({ error: { message: "Forbidden", status: 403 } }, { status: 403 });
  }

  const body = await request.json();
  const parsed = adminSettingsUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: { message: parsed.error.issues[0].message, status: 400 } },
      { status: 400 }
    );
  }

  const { settings, insuranceOptions } = parsed.data;
  const errors: string[] = [];

  if (settings && typeof settings === "object") {
    for (const [key, value] of Object.entries(settings)) {
      const { error } = await supabase
        .from("admin_settings")
        .upsert({ key, value: String(value) }, { onConflict: "key" });

      if (error) {
        errors.push(`admin_settings.${key}: ${error.message}`);
      }
    }
  }

  if (Array.isArray(insuranceOptions)) {
    for (const option of insuranceOptions) {
      if (option.id) {
        const { error } = await supabase
          .from("insurance_options")
          .update({
            coverage_amount_cents: option.coverage_amount_cents,
            surcharge_cents: option.surcharge_cents,
            is_active: option.is_active,
          })
          .eq("id", option.id);

        if (error) {
          errors.push(`insurance_options.${option.id}: ${error.message}`);
        }
      }
    }
  }

  if (errors.length > 0) {
    return NextResponse.json(
      { error: { message: `Partial save failure: ${errors.join("; ")}`, status: 500 } },
      { status: 500 }
    );
  }

  void logAuditEvent({
    actor_id: auth.user.id,
    action: "settings.updated",
    resource: "admin_settings",
    metadata: {
      settings_keys: settings ? Object.keys(settings) : [],
      insurance_options_count: insuranceOptions?.length ?? 0,
    },
  });

  return NextResponse.json({ data: { success: true } });
}
