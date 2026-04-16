-- ============================================================
-- LAVEINA PLATFORM — SEED DATA
-- ============================================================
-- This file is executed by `supabase db reset`. It creates all
-- reference data, test accounts, pickup points, and role assignments
-- in a single pass. No manual steps required.
-- ============================================================


-- ─── 1. WEIGHT TIER CONFIG ──────────────────────────────────────────────────
-- Weight-based pricing tiers (6 tiers per Pricing Report)
-- Note: tiers are also seeded in the migration. This is a fallback for seed-only runs.
INSERT INTO public.parcel_size_config (size, min_weight_kg, max_weight_kg) VALUES
  ('tier_1', 0,     2),
  ('tier_2', 2.01,  5),
  ('tier_3', 5.01,  10),
  ('tier_4', 10.01, 15),
  ('tier_5', 15.01, 20),
  ('tier_6', 20.01, 30)
ON CONFLICT (size) DO NOTHING;


-- ─── 2. INSURANCE OPTIONS ───────────────────────────────────────────────────
-- Laveina's own tiers (Barcelona internal). €25 included free.
INSERT INTO public.insurance_options (coverage_amount_cents, surcharge_cents, is_active, display_order) VALUES
  (2500,  0,   true, 1),   -- €25  | included
  (5000,  100, true, 2),   -- €50  | +€1
  (10000, 200, true, 3),   -- €100 | +€2
  (20000, 300, true, 4)    -- €200 | +€3
ON CONFLICT DO NOTHING;


-- ─── 3. ADMIN SETTINGS ─────────────────────────────────────────────────────
-- Defaults — admin can change from /admin/settings dashboard.
-- Barcelona prices from Pricing Report (IVA 21% included).
INSERT INTO public.admin_settings (key, value) VALUES
  ('sendcloud_margin_percent',         '25'),
  -- Barcelona internal: Standard prices (6 weight tiers, IVA included)
  ('internal_price_tier_1_cents',      '495'),    -- €4.95  (0–2 kg)
  ('internal_price_tier_2_cents',      '675'),    -- €6.75  (2–5 kg)
  ('internal_price_tier_3_cents',      '990'),    -- €9.90  (5–10 kg)
  ('internal_price_tier_4_cents',      '1440'),   -- €14.40 (10–15 kg)
  ('internal_price_tier_5_cents',      '1800'),   -- €18.00 (15–20 kg)
  ('internal_price_tier_6_cents',      '2520'),   -- €25.20 (20–30 kg)
  -- SendCloud sender defaults
  ('sendcloud_sender_name',    'Laveina'),
  ('sendcloud_sender_address', 'Rambla de l''Exposicio 103, Planta 1 - Local'),
  ('sendcloud_sender_city',    'Vilanova i la Geltru'),
  ('sendcloud_sender_postcode','08800'),
  ('sendcloud_sender_phone',   '')
ON CONFLICT (key) DO NOTHING;


-- ─── 4. TEST ACCOUNTS ──────────────────────────────────────────────────────
-- IMPORTANT: On hosted Supabase, DO NOT create users via SQL INSERT.
-- GoTrue requires users to be created through its Admin API for proper
-- password hashing and identity setup.
--
-- Test accounts are created by running: node scripts/seed-hosted.js
-- Or manually via Supabase Dashboard → Authentication → Users → Add user.
--
-- Core credentials (seed script creates these):
--   admin@laveina-test.com        / TestAdmin123!    (role: admin)
--   customer@laveina-test.com     / TestCustomer123! (role: customer)
--
-- Pickup point owner accounts are created via CSV import:
--   POST /api/pickup-points/import { csv: "...", default_password: "TestShop123!" }
--   This creates owner accounts with password "TestShop123!" linked to their pickup points.
--
-- The SQL below is for local `supabase db reset` only (local GoTrue handles it fine).
-- For hosted Supabase, skip this section and use the Admin API instead.

INSERT INTO auth.users (
  id, instance_id, aud, role,
  email, encrypted_password,
  email_confirmed_at, confirmation_sent_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) VALUES
  -- Admin
  (
    'b0000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'admin@laveina-test.com',
    extensions.crypt('TestAdmin123!', extensions.gen_salt('bf')),
    now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Test Admin"}',
    now(), now()
  ),
  -- Customer
  (
    'b0000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'customer@laveina-test.com',
    extensions.crypt('TestCustomer123!', extensions.gen_salt('bf')),
    now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Test Customer"}',
    now(), now()
  )
ON CONFLICT (id) DO NOTHING;

-- Auth identities (required for email/password login in Supabase Auth)
INSERT INTO auth.identities (
  id, user_id, provider_id, provider,
  identity_data, last_sign_in_at, created_at, updated_at
) VALUES
  (
    gen_random_uuid(),
    'b0000000-0000-0000-0000-000000000001',
    'admin@laveina-test.com', 'email',
    '{"sub":"b0000000-0000-0000-0000-000000000001","email":"admin@laveina-test.com"}',
    now(), now(), now()
  ),
  (
    gen_random_uuid(),
    'b0000000-0000-0000-0000-000000000004',
    'customer@laveina-test.com', 'email',
    '{"sub":"b0000000-0000-0000-0000-000000000004","email":"customer@laveina-test.com"}',
    now(), now(), now()
  )
ON CONFLICT DO NOTHING;


-- ─── 5. SET ROLES ───────────────────────────────────────────────────────────
-- The handle_new_user() trigger created profile rows with role='customer'.
-- Now promote admin account.
UPDATE public.profiles SET role = 'admin' WHERE id = 'b0000000-0000-0000-0000-000000000001';


-- ─── 6. PICKUP POINTS ──────────────────────────────────────────────────────
-- Pickup points are now imported via CSV through the admin dashboard.
-- Use the CSV import API with default_password for testing:
--   POST /api/pickup-points/import
--   { csv: "<CSV data with Owner Email column>", default_password: "TestShop123!" }
--
-- This creates both the pickup point records and owner accounts in one step.
-- Owner accounts get password "TestShop123!" and role "pickup_point" automatically.
