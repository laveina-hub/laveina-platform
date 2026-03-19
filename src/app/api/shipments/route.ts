import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { listShipments } from "@/services/shipment.service";
import { ShipmentStatus } from "@/types/enums";

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(Object.values(ShipmentStatus) as [string, ...string[]]).optional(),
  customerId: z.string().uuid().optional(),
  search: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = listQuerySchema.safeParse({
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    customerId: searchParams.get("customerId") ?? undefined,
    search: searchParams.get("search") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const result = await listShipments({
    page: parsed.data.page,
    pageSize: parsed.data.pageSize,
    status: parsed.data.status as (typeof ShipmentStatus)[keyof typeof ShipmentStatus] | undefined,
    customer_id: parsed.data.customerId,
    search: parsed.data.search,
  });

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  return NextResponse.json({ data: result.data });
}
