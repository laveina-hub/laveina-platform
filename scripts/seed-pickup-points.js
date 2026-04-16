/**
 * Seeds pickup points from CSV + creates owner accounts with a default password.
 *
 * Usage:
 *   node scripts/seed-pickup-points.js                          # uses data/pickup-points.csv
 *   node scripts/seed-pickup-points.js path/to/custom.csv       # uses custom CSV
 *
 * Owner accounts get password "TestShop123!" and role "pickup_point".
 * Replace the CSV with real data + real emails for production (use admin dashboard import instead).
 */

const { createClient } = require("@supabase/supabase-js");
const { readFileSync } = require("fs");
const { resolve } = require("path");

// ── Config ───────────────────────────────────────────────────────────────────
const DEFAULT_PASSWORD = "TestShop123!";
const CSV_PATH = process.argv[2] || resolve(__dirname, "..", "data", "pickup-points.csv");

// ── Load .env.local ──────────────────────────────────────────────────────────
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

// ── CSV Parser (mirrors src/validations/pickup-point.schema.ts) ──────────────
function parseCsv(csvText) {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) throw new Error("CSV must have header + at least one row");

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const v = lines[i].split(",").map((s) => s.trim());
    if (v.length < 8) continue;

    const postcode = v[2].replace(/\D/g, "").padStart(5, "0");
    const lat = parseFloat(v[4]);
    const lng = parseFloat(v[5]);
    if (isNaN(lat) || isNaN(lng)) continue;

    const parseDayHours = (raw) => {
      if (!raw || raw.toLowerCase() === "closed") return { open: false, slots: [] };
      const slots = raw
        .split(/\s+/)
        .map((r) => r.split("-"))
        .filter(([s, e]) => s && e);
      return { open: slots.length > 0, slots };
    };

    rows.push({
      name: v[0],
      address: v[1],
      postcode,
      city: v[3],
      latitude: lat,
      longitude: lng,
      phone: v[6] || null,
      email: v[7] || null,
      working_hours: {
        monday: parseDayHours(v[8]),
        tuesday: parseDayHours(v[9]),
        wednesday: parseDayHours(v[10]),
        thursday: parseDayHours(v[11]),
        friday: parseDayHours(v[12]),
        saturday: parseDayHours(v[13]),
        sunday: parseDayHours(v[14]),
      },
    });
  }
  return rows;
}

// ── Owner creation ───────────────────────────────────────────────────────────
async function ensureOwner(email) {
  // Check existing
  const { data: list } = await sb.auth.admin.listUsers({ perPage: 1000 });
  const existing = list?.users?.find((u) => u.email === email);

  if (existing) {
    await sb.from("profiles").update({ role: "pickup_point" }).eq("id", existing.id);
    return { id: existing.id, created: false };
  }

  const { data, error } = await sb.auth.admin.createUser({
    email,
    password: DEFAULT_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: email.split("@")[0] },
  });

  if (error) throw new Error(`Owner ${email}: ${error.message}`);

  await sb.from("profiles").update({ role: "pickup_point" }).eq("id", data.user.id);
  return { id: data.user.id, created: true };
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`Reading CSV: ${CSV_PATH}`);
  const csvText = readFileSync(CSV_PATH, "utf-8");
  const rows = parseCsv(csvText);
  console.log(`Parsed ${rows.length} pickup points\n`);

  let inserted = 0;
  let ownersCreated = 0;
  const failed = [];

  for (const row of rows) {
    let ownerId = null;

    // Create owner account using the Email column
    if (row.email) {
      try {
        const result = await ensureOwner(row.email);
        ownerId = result.id;
        if (result.created) ownersCreated++;
        console.log(
          `   Owner ${row.email} → ${result.created ? "created" : "exists"} (${result.id})`
        );
      } catch (err) {
        failed.push({ name: row.name, message: err.message });
        console.error(`   Owner ${row.email} → FAILED: ${err.message}`);
        continue;
      }
    }

    // Check if pickup point already exists
    const { data: existing } = await sb
      .from("pickup_points")
      .select("id")
      .eq("name", row.name)
      .eq("postcode", row.postcode)
      .maybeSingle();

    if (existing) {
      // Update existing record
      const { error } = await sb
        .from("pickup_points")
        .update({ ...row, owner_id: ownerId, is_active: true, is_open: true })
        .eq("id", existing.id);

      if (error) {
        failed.push({ name: row.name, message: error.message });
        console.log(`   ${row.name} → FAILED: ${error.message}`);
      } else {
        inserted++;
        console.log(`   ${row.name} → updated`);
      }
    } else {
      // Insert new record
      const { error } = await sb
        .from("pickup_points")
        .insert({ ...row, owner_id: ownerId, is_active: true, is_open: true });

      if (error) {
        failed.push({ name: row.name, message: error.message });
        console.log(`   ${row.name} → FAILED: ${error.message}`);
      } else {
        inserted++;
        console.log(`   ${row.name} → OK`);
      }
    }
  }

  console.log(
    `\nDone: ${inserted} imported, ${ownersCreated} owners created, ${failed.length} failed`
  );
  if (failed.length > 0) {
    console.log("Failed:");
    failed.forEach((f) => console.log(`  ${f.name}: ${f.message}`));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
