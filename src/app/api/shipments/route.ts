import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { verifyAuth } from "@/lib/supabase/auth";
import { listShipments } from "@/services/shipment.service";
import { ShipmentStatus } from "@/types/enums";

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(Object.values(ShipmentStatus) as [string, ...string[]]).optional(),
  active: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => v === "true"),
  customerId: z.string().uuid().optional(),
  search: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const auth = await verifyAuth();
  if (auth.error) return auth.error;
  const { user, role } = auth;

  const { searchParams } = new URL(request.url);
  const parsed = listQuerySchema.safeParse({
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    active: searchParams.get("active") ?? undefined,
    customerId: searchParams.get("customerId") ?? undefined,
    search: searchParams.get("search") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Customers can only see their own shipments
  const effectiveCustomerId = role === "admin" ? parsed.data.customerId : user.id;

  const result = await listShipments({
    page: parsed.data.page,
    pageSize: parsed.data.pageSize,
    status: parsed.data.status as (typeof ShipmentStatus)[keyof typeof ShipmentStatus] | undefined,
    active: parsed.data.active,
    customer_id: effectiveCustomerId,
    search: parsed.data.search,
  });

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  return NextResponse.json({ data: result.data });
}
