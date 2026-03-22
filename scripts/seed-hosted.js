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

const PICKUP_POINTS = [
  {
    id: "a0000000-0000-0000-0000-000000000001",
    name: "Librería Central",
    address: "Carrer de Mallorca, 123",
    postcode: "08036",
    city: "Barcelona",
    latitude: 41.3947,
    longitude: 2.1558,
    phone: "+34 93 123 4567",
    email: "central@laveina-test.com",
    is_active: true,
    is_open: true,
    working_hours: {
      monday: {
        open: true,
        slots: [
          ["09:00", "14:00"],
          ["16:00", "20:00"],
        ],
      },
      tuesday: {
        open: true,
        slots: [
          ["09:00", "14:00"],
          ["16:00", "20:00"],
        ],
      },
      wednesday: {
        open: true,
        slots: [
          ["09:00", "14:00"],
          ["16:00", "20:00"],
        ],
      },
      thursday: {
        open: true,
        slots: [
          ["09:00", "14:00"],
          ["16:00", "20:00"],
        ],
      },
      friday: {
        open: true,
        slots: [
          ["09:00", "14:00"],
          ["16:00", "20:00"],
        ],
      },
      saturday: { open: true, slots: [["10:00", "14:00"]] },
      sunday: { open: false, slots: [] },
    },
    owner_email: "shop-origin@laveina-test.com",
  },
  {
    id: "a0000000-0000-0000-0000-000000000002",
    name: "Papelería Sol",
    address: "Avinguda Diagonal, 456",
    postcode: "08029",
    city: "Barcelona",
    latitude: 41.392,
    longitude: 2.138,
    phone: "+34 93 234 5678",
    email: "sol@laveina-test.com",
    is_active: true,
    is_open: true,
    working_hours: {
      monday: {
        open: true,
        slots: [
          ["09:00", "14:00"],
          ["16:00", "20:00"],
        ],
      },
      tuesday: {
        open: true,
        slots: [
          ["09:00", "14:00"],
          ["16:00", "20:00"],
        ],
      },
      wednesday: {
        open: true,
        slots: [
          ["09:00", "14:00"],
          ["16:00", "20:00"],
        ],
      },
      thursday: {
        open: true,
        slots: [
          ["09:00", "14:00"],
          ["16:00", "20:00"],
        ],
      },
      friday: {
        open: true,
        slots: [
          ["09:00", "14:00"],
          ["16:00", "20:00"],
        ],
      },
      saturday: { open: true, slots: [["10:00", "14:00"]] },
      sunday: { open: false, slots: [] },
    },
    owner_email: "shop-dest@laveina-test.com",
  },
  {
    id: "a0000000-0000-0000-0000-000000000003",
    name: "Kiosko Marina",
    address: "Passeig de Gràcia, 78",
    postcode: "08008",
    city: "Barcelona",
    latitude: 41.395,
    longitude: 2.165,
    phone: "+34 93 345 6789",
    email: "marina@laveina-test.com",
    is_active: true,
    is_open: true,
    working_hours: {
      monday: { open: true, slots: [["08:00", "21:00"]] },
      tuesday: { open: true, slots: [["08:00", "21:00"]] },
      wednesday: { open: true, slots: [["08:00", "21:00"]] },
      thursday: { open: true, slots: [["08:00", "21:00"]] },
      friday: { open: true, slots: [["08:00", "21:00"]] },
      saturday: { open: true, slots: [["09:00", "14:00"]] },
      sunday: { open: false, slots: [] },
    },
    owner_email: null,
  },
  // ── Non-Barcelona pickup points (SendCloud routing) ──
  {
    id: "a0000000-0000-0000-0000-000000000004",
    name: "Papelería Gran Vía",
    address: "Gran Vía, 42",
    postcode: "28013",
    city: "Madrid",
    latitude: 40.42,
    longitude: -3.7025,
    phone: "+34 91 123 4567",
    email: "madrid@laveina-test.com",
    is_active: true,
    is_open: true,
    working_hours: {
      monday: {
        open: true,
        slots: [
          ["09:00", "14:00"],
          ["16:00", "20:00"],
        ],
      },
      tuesday: {
        open: true,
        slots: [
          ["09:00", "14:00"],
          ["16:00", "20:00"],
        ],
      },
      wednesday: {
        open: true,
        slots: [
          ["09:00", "14:00"],
          ["16:00", "20:00"],
        ],
      },
      thursday: {
        open: true,
        slots: [
          ["09:00", "14:00"],
          ["16:00", "20:00"],
        ],
      },
      friday: {
        open: true,
        slots: [
          ["09:00", "14:00"],
          ["16:00", "20:00"],
        ],
      },
      saturday: { open: true, slots: [["10:00", "14:00"]] },
      sunday: { open: false, slots: [] },
    },
    owner_email: null,
  },
  {
    id: "a0000000-0000-0000-0000-000000000005",
    name: "Librería Ruzafa",
    address: "Carrer de Russafa, 18",
    postcode: "46004",
    city: "Valencia",
    latitude: 39.463,
    longitude: -0.374,
    phone: "+34 96 123 4567",
    email: "valencia@laveina-test.com",
    is_active: true,
    is_open: true,
    working_hours: {
      monday: {
        open: true,
        slots: [
          ["09:00", "14:00"],
          ["16:00", "20:00"],
        ],
      },
      tuesday: {
        open: true,
        slots: [
          ["09:00", "14:00"],
          ["16:00", "20:00"],
        ],
      },
      wednesday: {
        open: true,
        slots: [
          ["09:00", "14:00"],
          ["16:00", "20:00"],
        ],
      },
      thursday: {
        open: true,
        slots: [
          ["09:00", "14:00"],
          ["16:00", "20:00"],
        ],
      },
      friday: {
        open: true,
        slots: [
          ["09:00", "14:00"],
          ["16:00", "20:00"],
        ],
      },
      saturday: { open: true, slots: [["10:00", "14:00"]] },
      sunday: { open: false, slots: [] },
    },
    owner_email: null,
  },
];

async function main() {
  // Step 1: Seed reference data
  console.log("1. Seeding reference data (parcel sizes, insurance, admin settings)...");

  console.log("   Seeding parcel_size_config...");
  const sizes = [
    { size: "small", max_weight_kg: 2, length_cm: 30, width_cm: 20, height_cm: 20 },
    { size: "medium", max_weight_kg: 5, length_cm: 35, width_cm: 35, height_cm: 24 },
    { size: "large", max_weight_kg: 10, length_cm: 40, width_cm: 40, height_cm: 37 },
    { size: "extra_large", max_weight_kg: 20, length_cm: 55, width_cm: 55, height_cm: 39 },
    { size: "xxl", max_weight_kg: 25, length_cm: 60, width_cm: 60, height_cm: 45 },
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
    { key: "internal_price_small_cents", value: "350" },
    { key: "internal_price_medium_cents", value: "500" },
    { key: "internal_price_large_cents", value: "700" },
    { key: "internal_price_extra_large_cents", value: "1000" },
    { key: "internal_price_xxl_cents", value: "1300" },
    { key: "internal_price_small_express_cents", value: "550" },
    { key: "internal_price_medium_express_cents", value: "750" },
    { key: "internal_price_large_express_cents", value: "1000" },
    { key: "internal_price_extra_large_express_cents", value: "1400" },
    { key: "internal_price_xxl_express_cents", value: "1800" },
    { key: "sendcloud_sender_name", value: "Laveina" },
    { key: "sendcloud_sender_address", value: "" },
    { key: "sendcloud_sender_city", value: "Barcelona" },
    { key: "sendcloud_sender_postcode", value: "08001" },
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
        // Fetch existing user ID
        const { data: listData } = await sb.auth.admin.listUsers();
        const existing = listData?.users?.find((x) => x.email === u.email);
        if (existing) userIdMap[u.email] = existing.id;
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

  // Step 3: Seed pickup points
  console.log("\n3. Seeding pickup points...");
  for (const pp of PICKUP_POINTS) {
    const ownerId = pp.owner_email ? userIdMap[pp.owner_email] || null : null;
    const row = {
      id: pp.id,
      name: pp.name,
      address: pp.address,
      postcode: pp.postcode,
      city: pp.city,
      latitude: pp.latitude,
      longitude: pp.longitude,
      phone: pp.phone,
      email: pp.email,
      is_active: pp.is_active,
      is_open: pp.is_open,
      working_hours: pp.working_hours,
      owner_id: ownerId,
    };
    const { error: ppErr } = await sb.from("pickup_points").upsert(row, { onConflict: "id" });
    console.log(ppErr ? `   ${pp.name} — FAILED: ${ppErr.message}` : `   ${pp.name} — OK`);
  }

  // Step 4: Verify logins
  console.log("\n4. Verifying logins...");
  const anonSb = createClient(supabaseUrl, anonKey);
  for (const u of USERS) {
    const r = await anonSb.auth.signInWithPassword({ email: u.email, password: u.password });
    console.log(`   ${u.email}: ${r.error ? "FAIL — " + r.error.message : "OK"}`);
  }

  console.log("\nDone!");
}

main().catch(console.error);
