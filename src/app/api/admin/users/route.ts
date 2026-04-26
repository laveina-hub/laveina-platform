import { NextResponse, type NextRequest } from "next/server";

import { verifyAuth } from "@/lib/supabase/auth";
import { listUsers } from "@/services/user.service";

export async function GET(request: NextRequest) {
  const auth = await verifyAuth();
  if (auth.error) return auth.error;

  if (auth.role !== "admin") {
    return NextResponse.json({ error: { message: "Forbidden", status: 403 } }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const query = {
    search: searchParams.get("search") ?? undefined,
    role: searchParams.get("role") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
  };

  const result = await listUsers(query);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.error.status });
  }

  return NextResponse.json({ data: result.data });
}
