import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/parcel-sizes
 *
 * Returns active parcel size configs from the DB.
 * Public — no auth required (needed in the booking form before login check).
 * Falls back to an empty array if the table doesn't exist yet (pre-migration).
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("parcel_size_config")
      .select("size, max_weight_kg, length_cm, width_cm, height_cm")
      .eq("is_active", true)
      .order("max_weight_kg", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
