-- ============================================================
-- LAVEINA PLATFORM — SEED DATA (dev-only fixtures)
-- ============================================================
-- Executed by `supabase db reset` after migrations.
--
-- Scope: dev-only fixtures (test accounts + role promotion).
-- Reference data (parcel sizes, presets, insurance options, pricing,
-- operational defaults) is owned by migrations in supabase/migrations/.
-- Do NOT duplicate reference data here — if a value needs to exist in
-- every environment, add it to a migration instead.
-- ============================================================


-- ─── TEST ACCOUNTS ─────────────────────────────────────────────────────────
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


-- ─── SET ROLES ──────────────────────────────────────────────────────────────
-- The handle_new_user() trigger created profile rows with role='customer'.
-- Now promote admin account.
UPDATE public.profiles SET role = 'admin' WHERE id = 'b0000000-0000-0000-0000-000000000001';


-- ─── PICKUP POINTS ──────────────────────────────────────────────────────────
-- Pickup points are imported via CSV through the admin dashboard.
-- Use the CSV import API with default_password for testing:
--   POST /api/pickup-points/import
--   { csv: "<CSV data with Owner Email column>", default_password: "TestShop123!" }
--
-- This creates both the pickup point records and owner accounts in one step.
-- Owner accounts get password "TestShop123!" and role "pickup_point" automatically.
