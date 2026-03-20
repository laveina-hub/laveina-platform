-- ============================================================
-- LAVEINA PLATFORM — SEED DATA
-- ============================================================
-- This file is executed by `supabase db reset`. It creates all
-- reference data, test accounts, pickup points, and role assignments
-- in a single pass. No manual steps required.
-- ============================================================


-- ─── 1. PARCEL SIZE CONFIG ──────────────────────────────────────────────────
-- Dimensions and max weight per size (admin-editable from /admin/settings)
INSERT INTO public.parcel_size_config (size, max_weight_kg, length_cm, width_cm, height_cm) VALUES
  ('small',       2,  30, 20, 20),
  ('medium',      5,  35, 35, 24),
  ('large',       10, 40, 40, 37),
  ('extra_large', 20, 55, 55, 39),
  ('xxl',         25, 60, 60, 45)
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
-- Barcelona prices confirmed by client (2026-03-20).
INSERT INTO public.admin_settings (key, value) VALUES
  ('sendcloud_margin_percent',                '25'),
  -- Barcelona internal: Standard prices
  ('internal_price_small_cents',              '350'),    -- €3.50
  ('internal_price_medium_cents',             '500'),    -- €5.00
  ('internal_price_large_cents',              '700'),    -- €7.00
  ('internal_price_extra_large_cents',        '1000'),   -- €10.00
  ('internal_price_xxl_cents',                '1300'),   -- €13.00
  -- Barcelona internal: Express 24h prices
  ('internal_price_small_express_cents',      '550'),    -- €5.50
  ('internal_price_medium_express_cents',     '750'),    -- €7.50
  ('internal_price_large_express_cents',      '1000'),   -- €10.00
  ('internal_price_extra_large_express_cents','1400'),   -- €14.00
  ('internal_price_xxl_express_cents',        '1800'),   -- €18.00
  -- SendCloud sender defaults
  ('sendcloud_sender_name',    'Laveina'),
  ('sendcloud_sender_address', ''),
  ('sendcloud_sender_city',    'Barcelona'),
  ('sendcloud_sender_postcode','08001'),
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
    '{"monday":"09:00-14:00,16:00-20:00","tuesday":"09:00-14:00,16:00-20:00","wednesday":"09:00-14:00,16:00-20:00","thursday":"09:00-14:00,16:00-20:00","friday":"09:00-14:00,16:00-20:00","saturday":"10:00-14:00","sunday":"closed"}',
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
    '{"monday":"09:00-14:00,16:00-20:00","tuesday":"09:00-14:00,16:00-20:00","wednesday":"09:00-14:00,16:00-20:00","thursday":"09:00-14:00,16:00-20:00","friday":"09:00-14:00,16:00-20:00","saturday":"10:00-14:00","sunday":"closed"}',
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
    '{"monday":"08:00-21:00","tuesday":"08:00-21:00","wednesday":"08:00-21:00","thursday":"08:00-21:00","friday":"08:00-21:00","saturday":"09:00-14:00","sunday":"closed"}',
    NULL  -- unassigned shop (available for testing)
  )
ON CONFLICT (id) DO NOTHING;
