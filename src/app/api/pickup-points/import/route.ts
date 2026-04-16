import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { verifyAuth } from "@/lib/supabase/auth";
import { bulkImportPickupPoints } from "@/services/pickup-point.service";
import { parseCsvPickupPoints } from "@/validations/pickup-point.schema";

export async function POST(request: NextRequest) {
  const auth = await verifyAuth();
  if (auth.error) return auth.error;

  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const csvText = body.csv;

  if (typeof csvText !== "string" || csvText.trim().length === 0) {
    return NextResponse.json({ error: "Missing or empty csv field" }, { status: 400 });
  }

  const { rows, errors: parseErrors } = parseCsvPickupPoints(csvText);

  if (rows.length === 0) {
    return NextResponse.json({ error: "No valid rows found", parseErrors }, { status: 400 });
  }

  const result = await bulkImportPickupPoints(rows);

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  return NextResponse.json({ data: result.data, parseErrors }, { status: 201 });
}
