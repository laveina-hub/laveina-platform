import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { adminSettingsUpdateSchema } from "@/validations/admin.schema";

async function verifyAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return profile?.role === "admin";
}

export async function GET() {
  const supabase = await createClient();

  if (!(await verifyAdmin(supabase))) {
    return NextResponse.json({ error: { message: "Forbidden", status: 403 } }, { status: 403 });
  }

  const [settingsResult, insuranceResult, parcelSizesResult] = await Promise.all([
    supabase.from("admin_settings").select("key, value"),
    supabase.from("insurance_options").select("*").order("coverage_amount_cents"),
    supabase.from("parcel_size_config").select("*").order("max_weight_kg"),
  ]);

  // Build settings map
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
  const supabase = await createClient();

  if (!(await verifyAdmin(supabase))) {
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

  // Update admin_settings key/value pairs
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

  // Update insurance options
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

  return NextResponse.json({ data: { success: true } });
}
