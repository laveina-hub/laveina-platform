import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { originPostcode, destinationPostcode, weightKg } = body;

    if (!originPostcode || !destinationPostcode || !weightKg) {
      return NextResponse.json(
        { error: "Missing required fields: originPostcode, destinationPostcode, weightKg" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    return NextResponse.json({
      price: null,
      currency: "EUR",
      message: "Price calculation not yet implemented",
    });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
