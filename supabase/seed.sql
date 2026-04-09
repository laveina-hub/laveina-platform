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
-- Test accounts are created by running this Node.js script (already done):
--   node scripts/create-test-users.js
--
-- Or manually via Supabase Dashboard → Authentication → Users → Add user.
--
-- Credentials:
--   admin@laveina-test.com        / TestAdmin123!   (role: admin)
--   shop-origin@laveina-test.com  / TestShop123!    (role: pickup_point, owns Librería Central)
--   shop-dest@laveina-test.com    / TestShop123!    (role: pickup_point, owns Papelería Sol)
--   customer@laveina-test.com     / TestCustomer123! (role: customer)
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
  -- Pickup Point Staff (Origin shop)
  (
    'b0000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'shop-origin@laveina-test.com',
    extensions.crypt('TestShop123!', extensions.gen_salt('bf')),
    now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Origin Shop Staff"}',
    now(), now()
  ),
  -- Pickup Point Staff (Destination shop)
  (
    'b0000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'shop-dest@laveina-test.com',
    extensions.crypt('TestShop123!', extensions.gen_salt('bf')),
    now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Destination Shop Staff"}',
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
    'b0000000-0000-0000-0000-000000000002',
    'shop-origin@laveina-test.com', 'email',
    '{"sub":"b0000000-0000-0000-0000-000000000002","email":"shop-origin@laveina-test.com"}',
    now(), now(), now()
  ),
  (
    gen_random_uuid(),
    'b0000000-0000-0000-0000-000000000003',
    'shop-dest@laveina-test.com', 'email',
    '{"sub":"b0000000-0000-0000-0000-000000000003","email":"shop-dest@laveina-test.com"}',
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
-- Now promote admin and pickup_point accounts.
UPDATE public.profiles SET role = 'admin'        WHERE id = 'b0000000-0000-0000-0000-000000000001';
UPDATE public.profiles SET role = 'pickup_point' WHERE id = 'b0000000-0000-0000-0000-000000000002';
UPDATE public.profiles SET role = 'pickup_point' WHERE id = 'b0000000-0000-0000-0000-000000000003';


-- ─── 6. TEST PICKUP POINTS ─────────────────────────────────────────────────
-- Sample partner shops in Barcelona. Replace with real data from client.
INSERT INTO public.pickup_points (
  id, name, address, postcode, city, latitude, longitude,
  phone, email, is_active, is_open, working_hours, owner_id
) VALUES
  (
    'a0000000-0000-0000-0000-000000000001',
    'Librería Central',
    'Carrer de Mallorca, 123',
    '08036',
    'Barcelona',
    41.3947, 2.1558,
    '+34 93 123 4567',
    'central@laveina-test.com',
    true, true,
    '{"monday":{"open":true,"slots":[["09:00","14:00"],["16:00","20:00"]]},"tuesday":{"open":true,"slots":[["09:00","14:00"],["16:00","20:00"]]},"wednesday":{"open":true,"slots":[["09:00","14:00"],["16:00","20:00"]]},"thursday":{"open":true,"slots":[["09:00","14:00"],["16:00","20:00"]]},"friday":{"open":true,"slots":[["09:00","14:00"],["16:00","20:00"]]},"saturday":{"open":true,"slots":[["10:00","14:00"]]},"sunday":{"open":false,"slots":[]}}',
    'b0000000-0000-0000-0000-000000000002'  -- owned by shop-origin@
  ),
  (
    'a0000000-0000-0000-0000-000000000002',
    'Papelería Sol',
    'Avinguda Diagonal, 456',
    '08029',
    'Barcelona',
    41.3920, 2.1380,
    '+34 93 234 5678',
    'sol@laveina-test.com',
    true, true,
    '{"monday":{"open":true,"slots":[["09:00","14:00"],["16:00","20:00"]]},"tuesday":{"open":true,"slots":[["09:00","14:00"],["16:00","20:00"]]},"wednesday":{"open":true,"slots":[["09:00","14:00"],["16:00","20:00"]]},"thursday":{"open":true,"slots":[["09:00","14:00"],["16:00","20:00"]]},"friday":{"open":true,"slots":[["09:00","14:00"],["16:00","20:00"]]},"saturday":{"open":true,"slots":[["10:00","14:00"]]},"sunday":{"open":false,"slots":[]}}',
    'b0000000-0000-0000-0000-000000000003'  -- owned by shop-dest@
  ),
  (
    'a0000000-0000-0000-0000-000000000003',
    'Kiosko Marina',
    'Passeig de Gràcia, 78',
    '08008',
    'Barcelona',
    41.3950, 2.1650,
    '+34 93 345 6789',
    'marina@laveina-test.com',
    true, true,
    '{"monday":{"open":true,"slots":[["08:00","21:00"]]},"tuesday":{"open":true,"slots":[["08:00","21:00"]]},"wednesday":{"open":true,"slots":[["08:00","21:00"]]},"thursday":{"open":true,"slots":[["08:00","21:00"]]},"friday":{"open":true,"slots":[["08:00","21:00"]]},"saturday":{"open":true,"slots":[["09:00","14:00"]]},"sunday":{"open":false,"slots":[]}}',
    NULL  -- unassigned shop (available for testing)
  ),
  -- ── Non-Barcelona pickup points (SendCloud routing) ──
  (
    'a0000000-0000-0000-0000-000000000004',
    'Papelería Gran Vía',
    'Gran Vía, 42',
    '28013',
    'Madrid',
    40.4200, -3.7025,
    '+34 91 123 4567',
    'madrid@laveina-test.com',
    true, true,
    '{"monday":{"open":true,"slots":[["09:00","14:00"],["16:00","20:00"]]},"tuesday":{"open":true,"slots":[["09:00","14:00"],["16:00","20:00"]]},"wednesday":{"open":true,"slots":[["09:00","14:00"],["16:00","20:00"]]},"thursday":{"open":true,"slots":[["09:00","14:00"],["16:00","20:00"]]},"friday":{"open":true,"slots":[["09:00","14:00"],["16:00","20:00"]]},"saturday":{"open":true,"slots":[["10:00","14:00"]]},"sunday":{"open":false,"slots":[]}}',
    NULL  -- unassigned (SendCloud test)
  ),
  (
    'a0000000-0000-0000-0000-000000000005',
    'Librería Ruzafa',
    'Carrer de Russafa, 18',
    '46004',
    'Valencia',
    39.4630, -0.3740,
    '+34 96 123 4567',
    'valencia@laveina-test.com',
    true, true,
    '{"monday":{"open":true,"slots":[["09:00","14:00"],["16:00","20:00"]]},"tuesday":{"open":true,"slots":[["09:00","14:00"],["16:00","20:00"]]},"wednesday":{"open":true,"slots":[["09:00","14:00"],["16:00","20:00"]]},"thursday":{"open":true,"slots":[["09:00","14:00"],["16:00","20:00"]]},"friday":{"open":true,"slots":[["09:00","14:00"],["16:00","20:00"]]},"saturday":{"open":true,"slots":[["10:00","14:00"]]},"sunday":{"open":false,"slots":[]}}',
    NULL  -- unassigned (SendCloud test)
  )
ON CONFLICT (id) DO NOTHING;
