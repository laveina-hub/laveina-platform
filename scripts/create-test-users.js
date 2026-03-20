/**
 * Creates test user accounts via Supabase Admin API.
 *
 * Usage: node scripts/create-test-users.js
 *
 * Requires .env.local with:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * This script is idempotent — it skips users that already exist.
 * Pickup points must already exist in the DB (created by seed.sql).
 */

const { createClient } = require("@supabase/supabase-js");
const { readFileSync } = require("fs");
const { resolve } = require("path");

// Load .env.local
const envPath = resolve(__dirname, "..", ".env.local");
const envContent = readFileSync(envPath, "utf-8");
const env = {};
for (const line of envContent.replace(/\r\n/g, "\n").split("\n")) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const sb = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const USERS = [
  { email: "admin@laveina-test.com", password: "TestAdmin123!", name: "Test Admin", role: "admin" },
  {
    email: "shop-origin@laveina-test.com",
    password: "TestShop123!",
    name: "Origin Shop Staff",
    role: "pickup_point",
  },
  {
    email: "shop-dest@laveina-test.com",
    password: "TestShop123!",
    name: "Destination Shop Staff",
    role: "pickup_point",
  },
  {
    email: "customer@laveina-test.com",
    password: "TestCustomer123!",
    name: "Test Customer",
    role: "customer",
  },
];

const PICKUP_POINT_OWNERS = {
  "shop-origin@laveina-test.com": "a0000000-0000-0000-0000-000000000001",
  "shop-dest@laveina-test.com": "a0000000-0000-0000-0000-000000000002",
};

async function main() {
  console.log("Creating test users via Supabase Admin API...\n");

  for (const u of USERS) {
    const { data, error } = await sb.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { full_name: u.name },
    });

    if (error) {
      if (error.message.includes("already been registered")) {
        console.log(`  ${u.email} — already exists (skipped)`);
      } else {
        console.error(`  ${u.email} — FAILED: ${error.message}`);
      }
      continue;
    }

    console.log(`  ${u.email} — created (${data.user.id})`);

    // Set role if not customer
    if (u.role !== "customer") {
      await sb.from("profiles").update({ role: u.role }).eq("id", data.user.id);
      console.log(`    role → ${u.role}`);
    }

    // Link pickup point ownership
    const ppId = PICKUP_POINT_OWNERS[u.email];
    if (ppId) {
      await sb.from("pickup_points").update({ owner_id: data.user.id }).eq("id", ppId);
      console.log(`    pickup_point → ${ppId}`);
    }
  }

  // Verify logins
  console.log("\nVerifying logins...");
  const anonSb = createClient(supabaseUrl, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  for (const u of USERS) {
    const r = await anonSb.auth.signInWithPassword({ email: u.email, password: u.password });
    console.log(`  ${u.email}: ${r.error ? "FAIL — " + r.error.message : "OK"}`);
  }

  console.log("\nDone.");
}

main().catch(console.error);
