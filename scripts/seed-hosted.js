/**
 * Seeds a hosted Supabase instance with all reference data + test users.
 *
 * Usage: node scripts/seed-hosted.js
 *
 * Requires .env.local with:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * This script is idempotent — uses ON CONFLICT and skips existing users.
 */

const { createClient } = require("@supabase/supabase-js");
const { readFileSync } = require("fs");
const { resolve } = require("path");

// ── Load .env.local ──────────────────────────────────────────────────────────
const envPath = resolve(__dirname, "..", ".env.local");
const envContent = readFileSync(envPath, "utf-8");
const env = {};
for (const line of envContent.replace(/\r\n/g, "\n").split("\n")) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey || !anonKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
  process.exit(1);
}

const sb = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Test users ───────────────────────────────────────────────────────────────
// Pickup point owner accounts are now created via CSV import (with default_password).
// Only admin + customer seed users are needed here.
const USERS = [
  { email: "admin@laveina-test.com", password: "TestAdmin123!", name: "Test Admin", role: "admin" },
  {
    email: "customer@laveina-test.com",
    password: "TestCustomer123!",
    name: "Test Customer",
    role: "customer",
  },
];

// ── Pickup points ────────────────────────────────────────────────────────────
// Pickup points are now imported via CSV through the admin dashboard.
// The CSV import API supports a `default_password` field for testing:
//   POST /api/pickup-points/import
//   { csv: "...", default_password: "TestShop123!" }
//
// This creates owner accounts with the given password (email_confirm: true)
// so they can log in immediately without receiving an invite email.
// In production, omit default_password to send real invite emails instead.

async function main() {
  // Step 1: Seed reference data
  console.log("1. Seeding reference data (parcel sizes, insurance, admin settings)...");

  console.log("   Seeding parcel_size_config (weight tiers)...");
  const sizes = [
    { size: "tier_1", min_weight_kg: 0, max_weight_kg: 2 },
    { size: "tier_2", min_weight_kg: 2.01, max_weight_kg: 5 },
    { size: "tier_3", min_weight_kg: 5.01, max_weight_kg: 10 },
    { size: "tier_4", min_weight_kg: 10.01, max_weight_kg: 15 },
    { size: "tier_5", min_weight_kg: 15.01, max_weight_kg: 20 },
    { size: "tier_6", min_weight_kg: 20.01, max_weight_kg: 30 },
  ];
  const { error: sizeErr } = await sb
    .from("parcel_size_config")
    .upsert(sizes, { onConflict: "size" });
  console.log(sizeErr ? `   FAILED: ${sizeErr.message}` : "   OK");

  console.log("   Seeding insurance_options...");
  const insurance = [
    { coverage_amount_cents: 2500, surcharge_cents: 0, is_active: true, display_order: 1 },
    { coverage_amount_cents: 5000, surcharge_cents: 100, is_active: true, display_order: 2 },
    { coverage_amount_cents: 10000, surcharge_cents: 200, is_active: true, display_order: 3 },
    { coverage_amount_cents: 20000, surcharge_cents: 300, is_active: true, display_order: 4 },
  ];
  const { error: insErr } = await sb
    .from("insurance_options")
    .upsert(insurance, { onConflict: "coverage_amount_cents" });
  console.log(insErr ? `   FAILED: ${insErr.message}` : "   OK");

  console.log("   Seeding admin_settings...");
  const settings = [
    { key: "sendcloud_margin_percent", value: "25" },
    { key: "internal_price_tier_1_cents", value: "495" },
    { key: "internal_price_tier_2_cents", value: "675" },
    { key: "internal_price_tier_3_cents", value: "990" },
    { key: "internal_price_tier_4_cents", value: "1440" },
    { key: "internal_price_tier_5_cents", value: "1800" },
    { key: "internal_price_tier_6_cents", value: "2520" },
    { key: "sendcloud_sender_name", value: "Laveina" },
    { key: "sendcloud_sender_address", value: "Rambla de l'Exposicio 103, Planta 1 - Local" },
    { key: "sendcloud_sender_city", value: "Vilanova i la Geltru" },
    { key: "sendcloud_sender_postcode", value: "08800" },
    { key: "sendcloud_sender_phone", value: "" },
  ];
  const { error: setErr } = await sb.from("admin_settings").upsert(settings, { onConflict: "key" });
  console.log(setErr ? `   FAILED: ${setErr.message}` : "   OK");

  // Step 2: Create test users via Admin API
  console.log("\n2. Creating test users via Admin API...");
  const userIdMap = {};
  for (const u of USERS) {
    const { data, error } = await sb.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { full_name: u.name },
    });

    if (error) {
      if (error.message.includes("already been registered")) {
        console.log(`   ${u.email} — already exists (skipped)`);
        // Fetch existing user ID by email
        const { data: listData } = await sb.auth.admin.listUsers();
        const existing = listData?.users?.find((x) => x.email === u.email);
        if (existing) {
          userIdMap[u.email] = existing.id;
          console.log(`     → found ID: ${existing.id}`);
          // Ensure profile exists
          const { error: profileErr } = await sb
            .from("profiles")
            .upsert(
              { id: existing.id, full_name: u.name, role: u.role, email: u.email },
              { onConflict: "id" }
            );
          if (profileErr) {
            console.log(`     → PROFILE UPSERT FAILED: ${profileErr.message}`);
          } else {
            console.log(`     → profile ensured`);
          }
        } else {
          console.log(`     → WARNING: could not find user in auth.users`);
        }
      } else {
        console.error(`   ${u.email} — FAILED: ${error.message}`);
      }
      continue;
    }

    console.log(`   ${u.email} — created (${data.user.id})`);
    userIdMap[u.email] = data.user.id;

    // Set role
    if (u.role !== "customer") {
      await sb.from("profiles").update({ role: u.role }).eq("id", data.user.id);
      console.log(`     role → ${u.role}`);
    }
  }

  // Step 3: Seed pickup points from CSV
  console.log("\n3. Seeding pickup points from CSV...");
  console.log("   Running: node scripts/seed-pickup-points.js");
  const { execSync } = require("child_process");
  try {
    const output = execSync("node scripts/seed-pickup-points.js", {
      cwd: resolve(__dirname, ".."),
      encoding: "utf-8",
      stdio: "pipe",
    });
    output.split("\n").forEach((line) => {
      if (line.trim()) console.log(`   ${line}`);
    });
  } catch (err) {
    console.error(`   FAILED: ${err.message}`);
  }

  // Step 4: Verify logins (with delay to avoid Supabase rate limiting)
  console.log("\n4. Verifying logins...");
  const anonSb = createClient(supabaseUrl, anonKey);
  for (const u of USERS) {
    const r = await anonSb.auth.signInWithPassword({ email: u.email, password: u.password });
    console.log(`   ${u.email}: ${r.error ? "FAIL — " + r.error.message : "OK"}`);
    // Small delay between sign-in attempts to avoid auth rate limiting
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log("\nDone!");
}

main().catch(console.error);
