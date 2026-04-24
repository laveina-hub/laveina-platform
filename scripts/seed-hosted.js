/**
 * Seeds a hosted Supabase instance with dev-only fixtures (test users + pickup points).
 *
 * Reference data (parcel presets, pricing, insurance options, weight tiers,
 * operational defaults) is owned by the migrations in supabase/migrations/
 * and is already in place after `npm run db:migrate`. Do not re-seed it here.
 *
 * Usage: node scripts/seed-hosted.js
 *
 * Requires .env.local with:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * This script is idempotent — skips existing users and upserts pickup points.
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
  // Step 1: Create test users via Admin API
  console.log("1. Creating test users via Admin API...");
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

  // Step 2: Seed pickup points from CSV
  console.log("\n2. Seeding pickup points from CSV...");
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

  // Step 3: Verify logins (with delay to avoid Supabase rate limiting)
  console.log("\n3. Verifying logins...");
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
