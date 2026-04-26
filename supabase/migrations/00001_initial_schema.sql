-- ============================================================
-- LAVEINA PLATFORM — COMPLETE DATABASE SCHEMA
-- Dual Delivery Model (Barcelona Internal + SendCloud) + M2
-- ============================================================
-- This is the single source of truth for the database schema.
-- Deploy this once to create all tables, enums, functions,
-- triggers, and RLS policies from scratch.
-- ============================================================


-- ============================================================
-- 0. EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ============================================================
-- 1. ENUMS
-- ============================================================

-- User roles for role-based access control
CREATE TYPE public.user_role AS ENUM (
  'admin',
  'pickup_point',
  'customer'
);

-- Shipment lifecycle status (7 stages)
CREATE TYPE public.shipment_status AS ENUM (
  'payment_confirmed',
  'waiting_at_origin',
  'received_at_origin',
  'in_transit',
  'arrived_at_destination',
  'ready_for_pickup',
  'delivered'
);

-- Delivery mode: Barcelona internal vs SendCloud carrier
CREATE TYPE public.delivery_mode AS ENUM (
  'internal',    -- Barcelona → Barcelona (Laveina own drivers)
  'sendcloud'    -- Rest of Spain (carrier via SendCloud API)
);

-- Delivery speed option
CREATE TYPE public.delivery_speed AS ENUM (
  'standard',    -- Cheapest carrier (default)
  'express',     -- Fastest 24h carrier (optional upgrade)
  'next_day'     -- Barcelona-only Next Day tier
);

-- Weight-based tiers (legacy 6-tier enum kept for Phase 1 compatibility;
-- Phase 2 app code uses parcel_presets instead)
CREATE TYPE public.parcel_size AS ENUM (
  'tier_1',        -- 0–2 kg
  'tier_2',        -- 2–5 kg
  'tier_3',        -- 5–10 kg
  'tier_4',        -- 10–15 kg
  'tier_5',        -- 15–20 kg
  'tier_6'         -- 20–30 kg
);


-- ============================================================
-- 2. HELPER FUNCTIONS (needed by triggers below)
-- ============================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Validate shipment status transitions (state machine)
-- Note: generate_tracking_id() and set_tracking_id() are defined after shipments table
CREATE OR REPLACE FUNCTION public.validate_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF NOT (
    (OLD.status = 'payment_confirmed'     AND NEW.status = 'waiting_at_origin') OR
    (OLD.status = 'waiting_at_origin'     AND NEW.status = 'received_at_origin') OR
    (OLD.status = 'received_at_origin'    AND NEW.status = 'in_transit') OR
    (OLD.status = 'in_transit'            AND NEW.status = 'arrived_at_destination') OR
    (OLD.status = 'arrived_at_destination' AND NEW.status = 'ready_for_pickup') OR
    (OLD.status = 'ready_for_pickup'      AND NEW.status = 'delivered')
  ) THEN
    RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 3. TABLES
-- ============================================================

-- ----- PROFILES -----
-- Extends Supabase Auth users with app-specific data
CREATE TABLE public.profiles (
  id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email             TEXT NOT NULL,
  full_name         TEXT NOT NULL,
  phone             TEXT,
  whatsapp          TEXT,
  city              TEXT,
  role              public.user_role NOT NULL DEFAULT 'customer',
  preferred_locale  TEXT NOT NULL DEFAULT 'es' CHECK (preferred_locale IN ('es', 'ca', 'en')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_role ON public.profiles(role);

-- Get current user's role (used by RLS policies)
-- Defined after profiles table exists
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
    'customer'  -- always customer; admins/pickup_points are set manually
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-create profile on auth signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ----- PICKUP POINTS -----
-- Partner shop locations where customers drop off / collect parcels
CREATE TABLE public.pickup_points (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  address         TEXT NOT NULL,
  postcode        TEXT NOT NULL,
  city            TEXT,
  latitude        DOUBLE PRECISION NOT NULL,
  longitude       DOUBLE PRECISION NOT NULL,
  phone           TEXT,
  email           TEXT,
  image_url       TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  is_open         BOOLEAN NOT NULL DEFAULT true,
  working_hours   JSONB,
  owner_id        UUID REFERENCES public.profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pickup_points_postcode ON public.pickup_points(postcode);
CREATE INDEX idx_pickup_points_active_open ON public.pickup_points(is_active, is_open);
CREATE INDEX idx_pickup_points_owner ON public.pickup_points(owner_id);

CREATE TRIGGER set_pickup_points_updated_at
  BEFORE UPDATE ON public.pickup_points
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ----- INSURANCE OPTIONS -----
-- Fixed coverage tiers for Barcelona internal shipments (admin-editable)
-- SendCloud routes use carrier insurance instead
CREATE TABLE public.insurance_options (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coverage_amount_cents INTEGER NOT NULL UNIQUE CHECK (coverage_amount_cents > 0),
  surcharge_cents      INTEGER NOT NULL DEFAULT 0 CHECK (surcharge_cents >= 0),
  is_active            BOOLEAN NOT NULL DEFAULT true,
  display_order        INTEGER NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_insurance_options_active ON public.insurance_options(is_active, display_order);

CREATE TRIGGER set_insurance_options_updated_at
  BEFORE UPDATE ON public.insurance_options
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ----- PARCEL PRESETS (M2) -----
-- Source of truth for the 4 M2 bands. The legacy parcel_size enum and
-- parcel_size_config table stay in place for Phase 1 compatibility;
-- app code moves to presets in Phase 2.
CREATE TABLE public.parcel_presets (
  slug           TEXT PRIMARY KEY,
  name_key       TEXT NOT NULL,                         -- i18n key e.g. 'parcelPresets.mini.name'
  example_key    TEXT NOT NULL,                         -- i18n key e.g. 'parcelPresets.mini.example'
  min_weight_kg  NUMERIC(5,2) NOT NULL CHECK (min_weight_kg >= 0),
  max_weight_kg  NUMERIC(5,2) NOT NULL CHECK (max_weight_kg > 0),
  length_cm      NUMERIC(5,1) NOT NULL CHECK (length_cm > 0),
  width_cm       NUMERIC(5,1) NOT NULL CHECK (width_cm > 0),
  height_cm      NUMERIC(5,1) NOT NULL CHECK (height_cm > 0),
  display_order  INTEGER NOT NULL DEFAULT 0,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (max_weight_kg > min_weight_kg)
);

CREATE INDEX idx_parcel_presets_active_order
  ON public.parcel_presets(is_active, display_order);

CREATE TRIGGER set_parcel_presets_updated_at
  BEFORE UPDATE ON public.parcel_presets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Weight bands per Q5.1–5.4. Dimensions are the reference cap shown to the user;
-- the absolute ceiling is enforced by CHECK constraints on shipments.
INSERT INTO public.parcel_presets
  (slug, name_key, example_key, min_weight_kg, max_weight_kg, length_cm, width_cm, height_cm, display_order)
VALUES
  ('mini',   'parcelPresets.mini.name',   'parcelPresets.mini.example',    0, 2,  30, 20, 20, 1),
  ('small',  'parcelPresets.small.name',  'parcelPresets.small.example',   2, 5,  35, 35, 24, 2),
  ('medium', 'parcelPresets.medium.name', 'parcelPresets.medium.example',  5, 10, 40, 40, 37, 3),
  ('large',  'parcelPresets.large.name',  'parcelPresets.large.example',  10, 20, 55, 55, 39, 4);


-- ----- SHIPMENTS -----
-- Core domain entity: tracks a parcel from payment to delivery
-- Size constraints (M2): weight ≤ 20 kg, L+W+H ≤ 149 cm, longest side ≤ 55 cm.
CREATE TABLE public.shipments (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id                 TEXT NOT NULL UNIQUE,
  customer_id                 UUID NOT NULL REFERENCES public.profiles(id),

  -- Sender & Receiver (split first/last names, WhatsApp + email per M2)
  sender_first_name           TEXT NOT NULL,
  sender_last_name            TEXT NOT NULL,
  sender_phone                TEXT NOT NULL,
  sender_whatsapp             TEXT,
  sender_email                TEXT NOT NULL,
  receiver_first_name         TEXT NOT NULL,
  receiver_last_name          TEXT NOT NULL,
  receiver_phone              TEXT NOT NULL,
  receiver_whatsapp           TEXT,
  receiver_email              TEXT NOT NULL,

  -- Pickup Points
  origin_pickup_point_id      UUID NOT NULL REFERENCES public.pickup_points(id),
  destination_pickup_point_id UUID NOT NULL REFERENCES public.pickup_points(id),
  origin_postcode             TEXT NOT NULL,
  destination_postcode        TEXT NOT NULL,

  -- Parcel Details
  parcel_size                 public.parcel_size NOT NULL,
  parcel_preset_slug          TEXT REFERENCES public.parcel_presets(slug),
  weight_kg                   NUMERIC(5,2) NOT NULL CHECK (weight_kg > 0 AND weight_kg <= 20),
  parcel_length_cm            NUMERIC(5,1) NOT NULL,
  parcel_width_cm             NUMERIC(5,1) NOT NULL,
  parcel_height_cm            NUMERIC(5,1) NOT NULL,
  billable_weight_kg          NUMERIC(5,2) NOT NULL CHECK (billable_weight_kg > 0),

  -- Delivery Mode (auto-detected by routing service)
  delivery_mode               public.delivery_mode NOT NULL,
  delivery_speed              public.delivery_speed NOT NULL DEFAULT 'standard',

  -- Pricing (snapshot at booking time)
  price_cents                 INTEGER NOT NULL CHECK (price_cents > 0),
  carrier_rate_cents          INTEGER,           -- NULL for Barcelona internal
  margin_percent              NUMERIC(5,2),      -- NULL for Barcelona internal
  insurance_option_id         UUID REFERENCES public.insurance_options(id),
  insurance_amount_cents      INTEGER NOT NULL DEFAULT 2500,
  insurance_surcharge_cents   INTEGER NOT NULL DEFAULT 0,

  -- Carrier / SendCloud (NULL for Barcelona internal)
  carrier_name                TEXT,              -- e.g. 'gls', 'dhl'
  carrier_tracking_number     TEXT,
  sendcloud_parcel_id         INTEGER,           -- v2 parcel id (kept — v3 parcel ids inside a shipment are still integers, used by the tracking webhook)
  sendcloud_shipment_id       TEXT,              -- v3 shipment id (string UUID) — used for cancel + GET shipment endpoints
  shipping_method_id          INTEGER,           -- v2 numeric selector (legacy)
  shipping_option_code        TEXT,              -- v3 carrier+service selector (e.g. 'correos:standard/signature'); persisted at booking, replayed at dispatch
  label_url                   TEXT,

  -- Payment
  stripe_payment_intent_id    TEXT,
  stripe_checkout_session_id  TEXT,          -- not UNIQUE: multi-parcel bookings share one session

  -- Status
  status                      public.shipment_status NOT NULL DEFAULT 'payment_confirmed',
  qr_code_url                 TEXT,

  -- Locale for transactional emails (copied from pending_bookings at webhook time)
  preferred_locale            TEXT NOT NULL DEFAULT 'es' CHECK (preferred_locale IN ('es', 'ca', 'en')),

  -- Timestamps
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT shipments_total_dimensions_check
    CHECK (parcel_length_cm + parcel_width_cm + parcel_height_cm <= 149),
  CONSTRAINT shipments_longest_side_check
    CHECK (GREATEST(parcel_length_cm, parcel_width_cm, parcel_height_cm) <= 55)
);

CREATE INDEX idx_shipments_tracking ON public.shipments(tracking_id);
CREATE INDEX idx_shipments_customer ON public.shipments(customer_id);
CREATE INDEX idx_shipments_status ON public.shipments(status);
CREATE INDEX idx_shipments_delivery_mode ON public.shipments(delivery_mode);
CREATE INDEX idx_shipments_origin ON public.shipments(origin_pickup_point_id);
CREATE INDEX idx_shipments_destination ON public.shipments(destination_pickup_point_id);
CREATE INDEX idx_shipments_created ON public.shipments(created_at DESC);
CREATE INDEX idx_shipments_stripe_session ON public.shipments(stripe_checkout_session_id);
CREATE INDEX idx_shipments_sendcloud_parcel ON public.shipments(sendcloud_parcel_id) WHERE sendcloud_parcel_id IS NOT NULL;
CREATE INDEX idx_shipments_sendcloud_shipment ON public.shipments(sendcloud_shipment_id) WHERE sendcloud_shipment_id IS NOT NULL;
CREATE INDEX idx_shipments_customer_created ON public.shipments(customer_id, created_at DESC);
CREATE INDEX idx_shipments_parcel_preset ON public.shipments(parcel_preset_slug);

-- Generate unique tracking ID (LAV-XXXX-XXXX format).
-- Unambiguous charset excludes 0, O, 1, I, L to prevent misreads.
CREATE OR REPLACE FUNCTION public.generate_tracking_id()
RETURNS TEXT AS $$
DECLARE
  safe_chars     CONSTANT TEXT := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  charset_len    CONSTANT INTEGER := length(safe_chars);
  new_id         TEXT;
  part1          TEXT;
  part2          TEXT;
  i              INTEGER;
  exists_already BOOLEAN;
BEGIN
  LOOP
    part1 := '';
    part2 := '';
    FOR i IN 1..4 LOOP
      part1 := part1 || substr(safe_chars, 1 + floor(random() * charset_len)::int, 1);
      part2 := part2 || substr(safe_chars, 1 + floor(random() * charset_len)::int, 1);
    END LOOP;
    new_id := 'LAV-' || part1 || '-' || part2;
    SELECT EXISTS(SELECT 1 FROM public.shipments WHERE tracking_id = new_id) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- Auto-set tracking_id on shipment insert
CREATE OR REPLACE FUNCTION public.set_tracking_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tracking_id IS NULL OR NEW.tracking_id = '' THEN
    NEW.tracking_id := public.generate_tracking_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_shipments_updated_at
  BEFORE UPDATE ON public.shipments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_shipment_tracking_id
  BEFORE INSERT ON public.shipments
  FOR EACH ROW EXECUTE FUNCTION public.set_tracking_id();

CREATE TRIGGER validate_shipment_status
  BEFORE UPDATE OF status ON public.shipments
  FOR EACH ROW EXECUTE FUNCTION public.validate_status_transition();


-- ----- SCAN LOGS -----
-- Full audit trail for every QR scan at pickup points
CREATE TABLE public.scan_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id     UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  scanned_by      UUID REFERENCES public.profiles(id),  -- NULL for system/webhook scans
  pickup_point_id UUID REFERENCES public.pickup_points(id),
  old_status      public.shipment_status NOT NULL,
  new_status      public.shipment_status NOT NULL,
  scanned_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_scan_logs_shipment ON public.scan_logs(shipment_id);
CREATE INDEX idx_scan_logs_scanned_by ON public.scan_logs(scanned_by);
CREATE INDEX idx_scan_logs_scanned_at ON public.scan_logs(scanned_at DESC);
CREATE INDEX idx_scan_logs_webhook_dedup ON public.scan_logs(shipment_id, new_status) WHERE scanned_by IS NULL;


-- ----- OTP VERIFICATIONS -----
-- WhatsApp OTP for final delivery verification
CREATE TABLE public.otp_verifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id   UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  otp_hash      TEXT NOT NULL,
  display_code  VARCHAR(6),       -- short-lived plaintext for /pickup/[trackingId]/[token]; nulled on verify
  expires_at    TIMESTAMPTZ NOT NULL,
  verified      BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_otp_shipment ON public.otp_verifications(shipment_id);
CREATE INDEX idx_otp_expires ON public.otp_verifications(expires_at);
CREATE INDEX idx_otp_active_lookup ON public.otp_verifications(shipment_id, verified, expires_at DESC);

-- Prevent race condition: only one unverified OTP per shipment at a time.
-- Expired rows are cleaned up by the application (or a future cron), so this
-- constraint ensures no duplicate pending OTPs exist for the same shipment.
CREATE UNIQUE INDEX idx_otp_active_per_shipment
  ON public.otp_verifications (shipment_id)
  WHERE verified = false;


-- ----- ADMIN SETTINGS -----
-- Key-value store for admin-configurable settings
-- Stores: margin %, Barcelona prices, min price, postcode prefix, etc.
CREATE TABLE public.admin_settings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT NOT NULL UNIQUE,
  value       TEXT NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_admin_settings_updated_at
  BEFORE UPDATE ON public.admin_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ----- WEIGHT TIER CONFIG (legacy) -----
-- Legacy 6-tier weight config. Kept for Phase 1 compatibility; Phase 2 app
-- code reads from parcel_presets instead.
CREATE TABLE public.parcel_size_config (
  size          public.parcel_size PRIMARY KEY,
  min_weight_kg NUMERIC(5,2)  NOT NULL CHECK (min_weight_kg >= 0),
  max_weight_kg NUMERIC(5,2)  NOT NULL CHECK (max_weight_kg > 0),
  is_active     BOOLEAN       NOT NULL DEFAULT true,
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CHECK (max_weight_kg > min_weight_kg)
);

CREATE TRIGGER set_parcel_size_config_updated_at
  BEFORE UPDATE ON public.parcel_size_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed weight tiers
INSERT INTO public.parcel_size_config (size, min_weight_kg, max_weight_kg) VALUES
  ('tier_1', 0,     2),
  ('tier_2', 2.01,  5),
  ('tier_3', 5.01,  10),
  ('tier_4', 10.01, 15),
  ('tier_5', 15.01, 20),
  ('tier_6', 20.01, 30);

-- Seed Barcelona M2 pricing: 4 bands × 3 speeds (EUR ex-VAT, cents, per Q15.2).
-- Values are the ex-VAT "Delivery" line shown to the customer; VAT (21%) is
-- added on top at checkout (Subtotal = Delivery + Insurance, VAT = 21% × Subtotal).
-- next_day is Barcelona-only — SendCloud routes read standard/express only.
INSERT INTO public.admin_settings (key, value) VALUES
  -- Mini (0–2 kg)
  ('bcn_price_mini_standard_cents',   '395'),
  ('bcn_price_mini_express_cents',    '690'),
  ('bcn_price_mini_next_day_cents',   '890'),
  -- Small (2–5 kg)
  ('bcn_price_small_standard_cents',  '495'),
  ('bcn_price_small_express_cents',   '790'),
  ('bcn_price_small_next_day_cents',  '990'),
  -- Medium (5–10 kg)
  ('bcn_price_medium_standard_cents', '595'),
  ('bcn_price_medium_express_cents',  '890'),
  ('bcn_price_medium_next_day_cents', '1090'),
  -- Large (10–20 kg)
  ('bcn_price_large_standard_cents',  '795'),
  ('bcn_price_large_express_cents',   '1090'),
  ('bcn_price_large_next_day_cents',  '1290')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Operational defaults. Warehouse address fields default to empty strings
-- and are filled via client confirmation. Cutoff times are the "order-by"
-- wall-clock hours (24h, local to the configured timezone) that gate which
-- delivery speeds the booking wizard offers.
--
-- SendCloud pricing knobs (Q15.1, Q16.1):
--   sendcloud_min_shipping_cents      — €4 floor applied after margin so
--                                       carrier rates below handling cost
--                                       don't reach customers. Parity with
--                                       BCN's cheapest €3.95.
--   sendcloud_quote_cache_ttl_seconds — server-side TTL for the in-memory
--                                       quote cache; smooths SendCloud API
--                                       load for repeated identical lookups.
INSERT INTO public.admin_settings (key, value) VALUES
  ('sendcloud_margin_percent',           '25'),
  ('sendcloud_min_shipping_cents',       '400'),
  ('sendcloud_quote_cache_ttl_seconds',  '300'),
  ('sendcloud_sender_name',              'Laveina'),
  ('sendcloud_sender_address',           ''),
  ('sendcloud_sender_city',              ''),
  ('sendcloud_sender_postcode',          ''),
  ('sendcloud_sender_phone',             ''),
  ('cutoff_next_day_hour_local',         '18'),
  ('cutoff_express_hour_local',          '20'),
  ('cutoff_timezone',                    'Europe/Madrid')
ON CONFLICT (key) DO NOTHING;


-- ----- NOTIFICATIONS LOG -----
-- WhatsApp message audit trail (via Gallabox)
CREATE TABLE public.notifications_log (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id         UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  recipient_phone     TEXT NOT NULL,
  template_name       TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending',
  sent_at             TIMESTAMPTZ,
  gallabox_message_id TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_log_shipment ON public.notifications_log(shipment_id);
CREATE INDEX idx_notifications_log_status ON public.notifications_log(status);

-- Pending bookings — stores full booking data before Stripe checkout.
-- Supports multi-parcel bookings (avoids Stripe metadata size limits).
-- The Stripe webhook reads from this table to create shipments.
-- Rows are marked processed=true after the webhook handles them.
-- Cleanup: delete unprocessed rows older than 24h via pg_cron.

CREATE TABLE public.pending_bookings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_data    JSONB NOT NULL,
  processed       BOOLEAN NOT NULL DEFAULT false,
  stripe_event_id TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pending_bookings_customer ON public.pending_bookings(customer_id);
CREATE INDEX idx_pending_bookings_cleanup ON public.pending_bookings(processed, created_at)
  WHERE NOT processed;

-- Defense-in-depth: guarantees one Stripe event_id maps to at most one
-- pending_booking. The webhook handler already prevents same-row double
-- processing via row-locked UPDATE; this rejects cross-row collisions
-- (handler catches SQLSTATE 23505 and treats as duplicate-webhook success).
-- Partial WHERE NOT NULL so legacy/unprocessed rows aren't constrained.
CREATE UNIQUE INDEX idx_pending_bookings_stripe_event_unique
  ON public.pending_bookings(stripe_event_id)
  WHERE stripe_event_id IS NOT NULL;


-- ----- AUDIT LOGS -----
-- Tracks sensitive operations for compliance and debugging.
CREATE TABLE public.audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID REFERENCES public.profiles(id),       -- NULL for system/webhook actions
  action      TEXT NOT NULL,                               -- e.g. 'payment.completed', 'otp.verified', 'settings.updated'
  resource    TEXT NOT NULL,                               -- e.g. 'shipment', 'pickup_point', 'admin_settings'
  resource_id TEXT,                                        -- ID of the affected resource (nullable for bulk ops)
  metadata    JSONB DEFAULT '{}'::jsonb,                   -- Additional context (amounts, old/new values, etc.)
  ip_address  TEXT,                                        -- Client IP when available
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON public.audit_logs(resource, resource_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);


-- ----- RATINGS (M2) -----
-- Sender rating for a delivered shipment. Optional detailed breakdown.
-- A11: ratings publish immediately (default 'approved'); the customer can edit
-- their own rating for 7 days after creation. Admins can still moderate via
-- the admin_all policy.
CREATE TABLE public.ratings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id         UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  customer_id         UUID NOT NULL REFERENCES public.profiles(id),
  pickup_point_id     UUID REFERENCES public.pickup_points(id),   -- rated pickup point (destination)
  stars               INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment             TEXT,
  breakdown           JSONB,        -- { on_time, packaging, communication, pickup_experience } each 1–5
  status              TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending','approved','rejected')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (shipment_id, customer_id)
);

CREATE INDEX idx_ratings_pickup_point ON public.ratings(pickup_point_id);
CREATE INDEX idx_ratings_customer     ON public.ratings(customer_id);
CREATE INDEX idx_ratings_status       ON public.ratings(status);

CREATE TRIGGER set_ratings_updated_at
  BEFORE UPDATE ON public.ratings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ----- SAVED ADDRESSES (M2) -----
-- Customer saved pickup points for reuse in the booking flow.
CREATE TABLE public.saved_addresses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label             TEXT NOT NULL,
  pickup_point_id   UUID NOT NULL REFERENCES public.pickup_points(id),
  is_default        BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_saved_addresses_customer ON public.saved_addresses(customer_id);
-- Only one default per customer.
CREATE UNIQUE INDEX idx_saved_addresses_one_default
  ON public.saved_addresses(customer_id)
  WHERE is_default = true;

CREATE TRIGGER set_saved_addresses_updated_at
  BEFORE UPDATE ON public.saved_addresses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ----- NOTIFICATION PREFERENCES (M2) -----
-- 6 template × 3 channel matrix per customer. Defaults blocked on A10.
CREATE TABLE public.notification_preferences (
  customer_id       UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  prefs             JSONB NOT NULL DEFAULT '{}'::jsonb,      -- { [template]: { dashboard, whatsapp, email } }
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ----- SUPPORT TICKETS (M2) -----
-- Customer → admin contact form. Live chat is handled by Crisp.
CREATE TABLE public.support_tickets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shipment_id       UUID REFERENCES public.shipments(id) ON DELETE SET NULL,
  subject           TEXT NOT NULL,
  message           TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  admin_response    TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_tickets_customer ON public.support_tickets(customer_id);
CREATE INDEX idx_support_tickets_status   ON public.support_tickets(status);

CREATE TRIGGER set_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ----- DELIVERY CONFIRMATION TOKENS (M2) -----
-- Signed tokens used to gate the public /delivery-confirm/[trackingId]/[token] page.
-- Tokens are single-use; service role issues + verifies them.
CREATE TABLE public.delivery_confirmation_tokens (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id       UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  token_hash        TEXT NOT NULL UNIQUE,
  expires_at        TIMESTAMPTZ NOT NULL,
  consumed_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_delivery_confirmation_tokens_shipment
  ON public.delivery_confirmation_tokens(shipment_id);
CREATE INDEX idx_delivery_confirmation_tokens_active
  ON public.delivery_confirmation_tokens(shipment_id, expires_at)
  WHERE consumed_at IS NULL;


-- ----- OTP RECEIVER TOKENS (M2) -----
-- Public receiver-facing /pickup/[trackingId]/[token] landing. The 6-digit OTP
-- still lives in otp_verifications; this table holds the one-time URL token.
CREATE TABLE public.otp_receiver_tokens (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id       UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  token_hash        TEXT NOT NULL UNIQUE,
  expires_at        TIMESTAMPTZ NOT NULL,
  last_accessed_at  TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_otp_receiver_tokens_shipment
  ON public.otp_receiver_tokens(shipment_id);
CREATE INDEX idx_otp_receiver_tokens_active
  ON public.otp_receiver_tokens(shipment_id, expires_at);


-- ----- PICKUP POINT OVERRIDES (M2) -----
-- Admin / shop owner toggle for "temporarily closed" (vacations, incidents).
-- Replaces runtime use of pickup_points.is_open — that column is kept as a fast
-- default and will be recomputed from this table + weekly hours in Phase 8.2.
CREATE TABLE public.pickup_point_overrides (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pickup_point_id   UUID NOT NULL REFERENCES public.pickup_points(id) ON DELETE CASCADE,
  starts_at         TIMESTAMPTZ NOT NULL,
  ends_at           TIMESTAMPTZ,                          -- NULL = indefinite
  reason            TEXT,
  created_by        UUID REFERENCES public.profiles(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at IS NULL OR ends_at > starts_at)
);

CREATE INDEX idx_pickup_point_overrides_active
  ON public.pickup_point_overrides(pickup_point_id, starts_at, ends_at);


-- ============================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcel_size_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcel_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_confirmation_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_receiver_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_point_overrides ENABLE ROW LEVEL SECURITY;

-- ===== PROFILES =====
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY profiles_select_admin ON public.profiles
  FOR SELECT USING (public.get_user_role() = 'admin');

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY profiles_admin_update ON public.profiles
  FOR UPDATE
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

-- ===== PICKUP POINTS =====
CREATE POLICY pickup_points_select_active ON public.pickup_points
  FOR SELECT USING (is_active = true);

CREATE POLICY pickup_points_admin_all ON public.pickup_points
  FOR ALL USING (public.get_user_role() = 'admin');

CREATE POLICY pickup_points_owner_update ON public.pickup_points
  FOR UPDATE USING (owner_id = auth.uid());

-- ===== INSURANCE OPTIONS =====
CREATE POLICY insurance_options_select_active ON public.insurance_options
  FOR SELECT USING (is_active = true);

CREATE POLICY insurance_options_admin_all ON public.insurance_options
  FOR ALL USING (public.get_user_role() = 'admin');

-- ===== PARCEL SIZE CONFIG =====
-- Everyone can read (needed for booking form + pricing page)
-- Only admin can update dimensions/weights
CREATE POLICY parcel_size_config_select_all ON public.parcel_size_config
  FOR SELECT USING (true);

CREATE POLICY parcel_size_config_admin_update ON public.parcel_size_config
  FOR UPDATE USING (public.get_user_role() = 'admin');

-- ===== PARCEL PRESETS =====
CREATE POLICY parcel_presets_select_all ON public.parcel_presets
  FOR SELECT USING (true);

CREATE POLICY parcel_presets_admin_all ON public.parcel_presets
  FOR ALL USING (public.get_user_role() = 'admin');

-- ===== SHIPMENTS =====
CREATE POLICY shipments_select_own ON public.shipments
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY shipments_select_admin ON public.shipments
  FOR SELECT USING (public.get_user_role() = 'admin');

CREATE POLICY shipments_select_pickup_point ON public.shipments
  FOR SELECT USING (
    public.get_user_role() = 'pickup_point'
    AND (
      origin_pickup_point_id IN (SELECT id FROM public.pickup_points WHERE owner_id = auth.uid())
      OR destination_pickup_point_id IN (SELECT id FROM public.pickup_points WHERE owner_id = auth.uid())
    )
  );

CREATE POLICY shipments_admin_update ON public.shipments
  FOR UPDATE USING (public.get_user_role() = 'admin');

-- ===== SCAN LOGS =====
CREATE POLICY scan_logs_select_admin ON public.scan_logs
  FOR SELECT USING (public.get_user_role() = 'admin');

CREATE POLICY scan_logs_select_own ON public.scan_logs
  FOR SELECT USING (
    shipment_id IN (SELECT id FROM public.shipments WHERE customer_id = auth.uid())
  );

CREATE POLICY scan_logs_insert ON public.scan_logs
  FOR INSERT WITH CHECK (
    public.get_user_role() IN ('admin', 'pickup_point')
  );

-- ===== OTP VERIFICATIONS =====
CREATE POLICY otp_admin_all ON public.otp_verifications
  FOR ALL USING (public.get_user_role() IN ('admin', 'pickup_point'));

-- ===== ADMIN SETTINGS =====
CREATE POLICY admin_settings_select_all ON public.admin_settings
  FOR SELECT USING (true);  -- Everyone can read settings (needed for pricing)

CREATE POLICY admin_settings_admin_all ON public.admin_settings
  FOR ALL USING (public.get_user_role() = 'admin');

-- ===== NOTIFICATIONS LOG =====
CREATE POLICY notifications_log_admin_all ON public.notifications_log
  FOR ALL USING (public.get_user_role() = 'admin');

CREATE POLICY notifications_log_select_own ON public.notifications_log
  FOR SELECT USING (
    shipment_id IN (SELECT id FROM public.shipments WHERE customer_id = auth.uid())
  );


-- ===== AUDIT LOGS =====
CREATE POLICY audit_logs_select_admin ON public.audit_logs
  FOR SELECT USING (public.get_user_role() = 'admin');

CREATE POLICY audit_logs_insert_authenticated ON public.audit_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ===== PENDING BOOKINGS =====
CREATE POLICY pending_bookings_insert_own ON public.pending_bookings
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY pending_bookings_service_role ON public.pending_bookings
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ===== RATINGS =====
CREATE POLICY ratings_select_approved ON public.ratings
  FOR SELECT USING (status = 'approved');

CREATE POLICY ratings_select_own ON public.ratings
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY ratings_insert_own ON public.ratings
  FOR INSERT WITH CHECK (customer_id = auth.uid());

CREATE POLICY ratings_update_own ON public.ratings
  FOR UPDATE
  USING (customer_id = auth.uid() AND created_at > now() - INTERVAL '7 days')
  WITH CHECK (customer_id = auth.uid() AND created_at > now() - INTERVAL '7 days');

CREATE POLICY ratings_admin_all ON public.ratings
  FOR ALL USING (public.get_user_role() = 'admin');

-- ===== SAVED ADDRESSES =====
CREATE POLICY saved_addresses_own ON public.saved_addresses
  FOR ALL USING (customer_id = auth.uid()) WITH CHECK (customer_id = auth.uid());

CREATE POLICY saved_addresses_admin ON public.saved_addresses
  FOR SELECT USING (public.get_user_role() = 'admin');

-- ===== NOTIFICATION PREFERENCES =====
CREATE POLICY notification_preferences_own ON public.notification_preferences
  FOR ALL USING (customer_id = auth.uid()) WITH CHECK (customer_id = auth.uid());

CREATE POLICY notification_preferences_admin ON public.notification_preferences
  FOR SELECT USING (public.get_user_role() = 'admin');

-- ===== SUPPORT TICKETS =====
CREATE POLICY support_tickets_select_own ON public.support_tickets
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY support_tickets_insert_own ON public.support_tickets
  FOR INSERT WITH CHECK (customer_id = auth.uid());

CREATE POLICY support_tickets_admin_all ON public.support_tickets
  FOR ALL USING (public.get_user_role() = 'admin');

-- ===== DELIVERY CONFIRMATION TOKENS =====
-- Service role only — webhook/issuer creates, API route verifies via service role.
CREATE POLICY delivery_confirmation_tokens_service_role
  ON public.delivery_confirmation_tokens
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ===== OTP RECEIVER TOKENS =====
CREATE POLICY otp_receiver_tokens_service_role
  ON public.otp_receiver_tokens
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ===== PICKUP POINT OVERRIDES =====
-- Everyone can read (UI needs to show "closed" badge); only admin / owner writes.
CREATE POLICY pickup_point_overrides_select_all
  ON public.pickup_point_overrides
  FOR SELECT USING (true);

CREATE POLICY pickup_point_overrides_admin_all
  ON public.pickup_point_overrides
  FOR ALL USING (public.get_user_role() = 'admin');

CREATE POLICY pickup_point_overrides_owner_write
  ON public.pickup_point_overrides
  FOR INSERT WITH CHECK (
    pickup_point_id IN (SELECT id FROM public.pickup_points WHERE owner_id = auth.uid())
  );

CREATE POLICY pickup_point_overrides_owner_update
  ON public.pickup_point_overrides
  FOR UPDATE USING (
    pickup_point_id IN (SELECT id FROM public.pickup_points WHERE owner_id = auth.uid())
  );


-- ============================================================
-- 5. RPC FUNCTIONS
-- ============================================================

-- Admin dashboard stats — single DB round-trip for all aggregations
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT jsonb_build_object(
    'total_shipments',    COUNT(*),
    'waiting_at_origin',  COUNT(*) FILTER (WHERE status = 'waiting_at_origin'),
    'received_at_origin', COUNT(*) FILTER (WHERE status = 'received_at_origin'),
    'in_transit',         COUNT(*) FILTER (WHERE status = 'in_transit'),
    'arrived_at_destination', COUNT(*) FILTER (WHERE status = 'arrived_at_destination'),
    'ready_for_pickup',   COUNT(*) FILTER (WHERE status = 'ready_for_pickup'),
    'delivered',          COUNT(*) FILTER (WHERE status = 'delivered'),
    'total_revenue_cents', COALESCE(SUM(price_cents), 0),
    'active_pickup_points', (
      SELECT COUNT(*) FROM public.pickup_points WHERE is_active = true
    )
  )
  FROM public.shipments;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_stats() TO authenticated;

-- Lightweight fallback for total revenue when the full stats RPC is unavailable
CREATE OR REPLACE FUNCTION public.get_total_revenue_cents()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(SUM(price_cents), 0)::bigint FROM public.shipments;
$$;

GRANT EXECUTE ON FUNCTION public.get_total_revenue_cents() TO authenticated;


-- ============================================================
-- 6. ADMIN NOTIFICATIONS
-- ============================================================

CREATE TYPE public.notification_type AS ENUM (
  'new_booking_paid',
  'parcel_received_at_origin',
  'dispatch_failed',
  'delivery_problem',
  'parcel_returned',
  'parcel_delivered'
);

CREATE TYPE public.notification_priority AS ENUM (
  'low',
  'normal',
  'high',
  'critical'
);

CREATE TABLE public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.notification_type NOT NULL,
  priority public.notification_priority NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read')),
  title TEXT NOT NULL,
  description TEXT,
  shipment_id UUID REFERENCES public.shipments(id) ON DELETE SET NULL,
  tracking_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);

CREATE INDEX idx_admin_notifications_status ON public.admin_notifications(status);
CREATE INDEX idx_admin_notifications_created_at ON public.admin_notifications(created_at DESC);
CREATE INDEX idx_admin_notifications_shipment ON public.admin_notifications(shipment_id);
CREATE INDEX idx_admin_notifications_priority ON public.admin_notifications(priority);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_notifications_admin_all
  ON public.admin_notifications
  FOR ALL USING (public.get_user_role() = 'admin');

ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;


-- ============================================================
-- 7. STORAGE: PICKUP POINT PHOTOS BUCKET
-- ============================================================
-- Public-read bucket for pickup-point photos. Uploads restricted to
-- authenticated admin via the storage policies below.

INSERT INTO storage.buckets (id, name, public)
VALUES ('pickup-point-photos', 'pickup-point-photos', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "pickup_point_photos_public_read" ON storage.objects;
CREATE POLICY "pickup_point_photos_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'pickup-point-photos');

DROP POLICY IF EXISTS "pickup_point_photos_admin_write" ON storage.objects;
CREATE POLICY "pickup_point_photos_admin_write"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'pickup-point-photos'
    AND public.get_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "pickup_point_photos_admin_update" ON storage.objects;
CREATE POLICY "pickup_point_photos_admin_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'pickup-point-photos'
    AND public.get_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "pickup_point_photos_admin_delete" ON storage.objects;
CREATE POLICY "pickup_point_photos_admin_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'pickup-point-photos'
    AND public.get_user_role() = 'admin'
  );


-- ============================================================
-- 8. TABLE GRANTS
-- ============================================================
GRANT ALL ON ALL TABLES    IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES    IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
