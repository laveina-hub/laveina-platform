import { after, NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { adminLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { verifyAuth } from "@/lib/supabase/auth";
import { logAuditEvent } from "@/services/audit.service";
import { bulkImportPickupPoints } from "@/services/pickup-point.service";
import { parseCsvPickupPoints } from "@/validations/pickup-point.schema";

// Caps protect the function from a malicious or fat-fingered admin upload:
// 2 MB / 5k rows comfortably covers the entire Spanish pickup-point footprint
// while keeping a single request bounded in memory, parse time, and DB writes.
const MAX_CSV_BYTES = 2_000_000;
const MAX_CSV_ROWS = 5000;

const importBodySchema = z.object({
  csv: z
    .string()
    .min(1, "Missing or empty csv field")
    .max(MAX_CSV_BYTES, "CSV exceeds 2 MB size limit"),
});

export async function POST(request: NextRequest) {
  const rl = adminLimiter.check(getClientIp(request));
  if (!rl.success) return rateLimitResponse(rl.resetMs);

  const auth = await verifyAuth();
  if (auth.error) return auth.error;

  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = importBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request", status: 400 },
      { status: 400 }
    );
  }

  const { rows, errors: parseErrors } = parseCsvPickupPoints(parsed.data.csv);

  if (rows.length === 0) {
    return NextResponse.json({ error: "No valid rows found", parseErrors }, { status: 400 });
  }

  if (rows.length > MAX_CSV_ROWS) {
    return NextResponse.json(
      { error: `CSV exceeds ${MAX_CSV_ROWS}-row import limit`, parsedRows: rows.length },
      { status: 400 }
    );
  }

  const result = await bulkImportPickupPoints(rows);

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  after(
    logAuditEvent({
      actor_id: auth.user.id,
      action: "pickup_points.imported",
      resource: "pickup_points",
      metadata: {
        rows_imported: rows.length,
        parse_error_count: parseErrors.length,
      },
    }).catch(() => {})
  );

  return NextResponse.json({ data: result.data, parseErrors }, { status: 201 });
}
