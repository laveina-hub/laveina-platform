import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { calculatePrice } from "@/services/pricing.service";

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

    const result = await calculatePrice(originPostcode, destinationPostcode, weightKg);

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: result.error.status });
    }

    return NextResponse.json({ data: result.data });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
