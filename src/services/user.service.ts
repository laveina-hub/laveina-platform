import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiResponse } from "@/types/api";
import type { UserRole } from "@/types/enums";
import { updateUserRoleSchema, userListQuerySchema } from "@/validations/user.schema";

export type UserProfile = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
  shipment_count: number;
};

type RoleCounts = Record<string, number>;

type UserListResult = {
  data: UserProfile[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  roleCounts: RoleCounts;
};

export async function listUsers(query: unknown): Promise<ApiResponse<UserListResult>> {
  const parsed = userListQuerySchema.safeParse(query);
  if (!parsed.success) {
    return {
      data: null,
      error: { message: parsed.error.issues[0].message, code: "VALIDATION_ERROR", status: 400 },
    };
  }

  const { search, role, page, pageSize } = parsed.data;
  const supabase = createAdminClient();

  let countQuery = supabase.from("profiles").select("id", { count: "exact", head: true });
  let dataQuery = supabase
    .from("profiles")
    .select("id, email, full_name, phone, role, created_at, updated_at");

  if (role) {
    countQuery = countQuery.eq("role", role);
    dataQuery = dataQuery.eq("role", role);
  }

  if (search) {
    const filter = `full_name.ilike.%${search}%,email.ilike.%${search}%`;
    countQuery = countQuery.or(filter);
    dataQuery = dataQuery.or(filter);
  }

  const offset = (page - 1) * pageSize;
  dataQuery = dataQuery
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  const roles: UserRole[] = ["admin", "pickup_point", "customer"];
  const roleCountQueries = roles.map((r) =>
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", r)
  );

  const [countResult, dataResult, ...roleCountResults] = await Promise.all([
    countQuery,
    dataQuery,
    ...roleCountQueries,
  ]);

  if (countResult.error) {
    return {
      data: null,
      error: { message: countResult.error.message, code: "DB_ERROR", status: 500 },
    };
  }
  if (dataResult.error) {
    return {
      data: null,
      error: { message: dataResult.error.message, code: "DB_ERROR", status: 500 },
    };
  }

  const total = countResult.count ?? 0;
  const profiles = dataResult.data ?? [];

  const roleCounts: RoleCounts = {};
  roles.forEach((r, i) => {
    roleCounts[r] = roleCountResults[i].count ?? 0;
  });

  const userIds = profiles.map((p) => p.id);
  const shipmentCounts: Record<string, number> = {};

  if (userIds.length > 0) {
    const countPromises = userIds.map(async (uid) => {
      const { count } = await supabase
        .from("shipments")
        .select("id", { count: "exact", head: true })
        .eq("customer_id", uid);
      return { uid, count: count ?? 0 };
    });

    const results = await Promise.all(countPromises);
    for (const { uid, count } of results) {
      shipmentCounts[uid] = count;
    }
  }

  const users: UserProfile[] = profiles.map((p) => ({
    ...p,
    // SAFETY: DB enum column
    role: p.role as UserRole,
    shipment_count: shipmentCounts[p.id] ?? 0,
  }));

  return {
    data: {
      data: users,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      roleCounts,
    },
    error: null,
  };
}

export async function getUserById(id: string): Promise<ApiResponse<UserProfile>> {
  const supabase = createAdminClient();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, phone, role, created_at, updated_at")
    .eq("id", id)
    .single();

  if (error || !profile) {
    return { data: null, error: { message: "User not found", code: "NOT_FOUND", status: 404 } };
  }

  const { count } = await supabase
    .from("shipments")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", id);

  return {
    data: {
      ...profile,
      // SAFETY: DB enum column
      role: profile.role as UserRole,
      shipment_count: count ?? 0,
    },
    error: null,
  };
}

export async function updateUserRole(
  userId: string,
  input: unknown
): Promise<ApiResponse<{ id: string; role: UserRole }>> {
  const parsed = updateUserRoleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      data: null,
      error: { message: parsed.error.issues[0].message, code: "VALIDATION_ERROR", status: 400 },
    };
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("profiles")
    .update({ role: parsed.data.role, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select("id, role")
    .single();

  if (error) {
    return { data: null, error: { message: error.message, code: "DB_ERROR", status: 500 } };
  }

  return {
    data: {
      id: data.id,
      // SAFETY: DB enum column
      role: data.role as UserRole,
    },
    error: null,
  };
}
