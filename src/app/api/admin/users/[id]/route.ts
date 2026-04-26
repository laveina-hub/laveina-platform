import { after, NextResponse, type NextRequest } from "next/server";

import { adminLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { verifyAuth } from "@/lib/supabase/auth";
import { logAuditEvent } from "@/services/audit.service";
import { getUserById, updateUserRole } from "@/services/user.service";
import { updateUserRoleSchema } from "@/validations/user.schema";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const auth = await verifyAuth();
  if (auth.error) return auth.error;

  if (auth.role !== "admin") {
    return NextResponse.json({ error: { message: "Forbidden", status: 403 } }, { status: 403 });
  }

  const { id } = await context.params;
  const result = await getUserById(id);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.error.status });
  }

  return NextResponse.json({ data: result.data });
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const rl = adminLimiter.check(getClientIp(request));
  if (!rl.success) return rateLimitResponse(rl.resetMs);

  const auth = await verifyAuth();
  if (auth.error) return auth.error;

  if (auth.role !== "admin") {
    return NextResponse.json({ error: { message: "Forbidden", status: 403 } }, { status: 403 });
  }

  const { id } = await context.params;

  // Prevent admins from demoting themselves
  if (id === auth.user.id) {
    return NextResponse.json(
      {
        error: {
          message: "adminUsers.cannotChangeOwnRole",
          code: "SELF_ROLE_CHANGE",
          status: 400,
        },
      },
      { status: 400 }
    );
  }

  const body: unknown = await request.json();
  const parsed = updateUserRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const result = await updateUserRole(id, parsed.data);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.error.status });
  }

  after(
    logAuditEvent({
      actor_id: auth.user.id,
      action: "user.role_changed",
      resource: "profiles",
      resource_id: id,
      metadata: { new_role: result.data.role },
    }).catch(() => {})
  );

  return NextResponse.json({ data: result.data });
}
