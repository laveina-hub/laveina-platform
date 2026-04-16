import { env } from "@/env";
import { createAdminClient } from "@/lib/supabase/admin";

type CreateOwnerResult = { userId: string; error: null } | { userId: null; error: string };

const DEV_PASSWORD = "TestShop123!";

/**
 * Creates a pickup point owner account.
 * Dev: creates with test password. Prod: sends Supabase invite email.
 * If user already exists, ensures pickup_point role and returns their ID.
 */
type OwnerInfo = {
  fullName?: string;
  phone?: string;
};

export async function createPickupPointOwner(
  email: string,
  info: OwnerInfo = {}
): Promise<CreateOwnerResult> {
  const admin = createAdminClient();
  const isProduction = process.env.NODE_ENV === "production" || env.SEND_OWNER_INVITES === "true";
  const displayName = info.fullName ?? email.split("@")[0];

  if (isProduction) {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: displayName },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/auth/set-password`,
    });

    if (error) {
      if (
        error.message.includes("already been registered") ||
        error.message.includes("already been invited")
      ) {
        return linkExistingUser(admin, email);
      }
      return { userId: null, error: error.message };
    }

    await admin
      .from("profiles")
      .update({ role: "pickup_point", full_name: displayName, phone: info.phone ?? null })
      .eq("id", data.user.id);

    return { userId: data.user.id, error: null };
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: DEV_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: displayName },
  });

  if (error) {
    if (error.message.includes("already been registered")) {
      return linkExistingUser(admin, email);
    }
    return { userId: null, error: error.message };
  }

  await admin
    .from("profiles")
    .update({ role: "pickup_point", full_name: displayName, phone: info.phone ?? null })
    .eq("id", data.user.id);

  return { userId: data.user.id, error: null };
}

async function linkExistingUser(
  admin: ReturnType<typeof createAdminClient>,
  email: string
): Promise<CreateOwnerResult> {
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (!profile) {
    return { userId: null, error: `User ${email} exists in auth but not in profiles` };
  }

  await admin.from("profiles").update({ role: "pickup_point" }).eq("id", profile.id);

  return { userId: profile.id, error: null };
}
