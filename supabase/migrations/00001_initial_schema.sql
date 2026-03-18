-- ============================================================
-- LAVEINA PLATFORM — COMPLETE DATABASE SCHEMA
-- Phase 1: Dual Delivery Model (Barcelona Internal + SendCloud)
-- ============================================================
-- This is the single source of truth for the database schema.
-- Deploy this once to create all tables, enums, functions,
-- triggers, and RLS policies from scratch.
-- ============================================================


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
  'express'      -- Fastest 24h carrier (optional upgrade)
);

-- Parcel size tiers (confirmed 2026-03-18)
CREATE TYPE public.parcel_size AS ENUM (
  'small',         -- 30×20×20 cm, max 2 kg
  'medium',        -- 35×35×24 cm, max 5 kg
  'large',         -- 40×40×37 cm, max 10 kg
  'extra_large',   -- 55×55×39 cm, max 20 kg
  'xxl'            -- 55×60×39 cm, max 25 kg
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

-- Generate unique tracking ID (LAV-XXXXXXXX format)
CREATE OR REPLACE FUNCTION public.generate_tracking_id()
RETURNS TEXT AS $$
DECLARE
  new_id TEXT;
  exists_already BOOLEAN;
BEGIN
  LOOP
    new_id := 'LAV-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
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

-- Validate shipment status transitions (state machine)
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

-- Get current user's role (used by RLS policies)
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
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'customer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 3. TABLES
-- ============================================================

-- ----- PROFILES -----
-- Extends Supabase Auth users with app-specific data
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT NOT NULL,
  phone       TEXT,
  role        public.user_role NOT NULL DEFAULT 'customer',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_role ON public.profiles(role);

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
  coverage_amount_cents INTEGER NOT NULL CHECK (coverage_amount_cents > 0),
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


-- ----- SHIPMENTS -----
-- Core domain entity: tracks a parcel from payment to delivery
CREATE TABLE public.shipments (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id                 TEXT NOT NULL UNIQUE,
  customer_id                 UUID NOT NULL REFERENCES public.profiles(id),

  -- Sender & Receiver
  sender_name                 TEXT NOT NULL,
  sender_phone                TEXT NOT NULL,
  receiver_name               TEXT NOT NULL,
  receiver_phone              TEXT NOT NULL,

  -- Pickup Points
  origin_pickup_point_id      UUID NOT NULL REFERENCES public.pickup_points(id),
  destination_pickup_point_id UUID NOT NULL REFERENCES public.pickup_points(id),
  origin_postcode             TEXT NOT NULL,
  destination_postcode        TEXT NOT NULL,

  -- Parcel Details
  parcel_size                 public.parcel_size NOT NULL,
  weight_kg                   NUMERIC(5,2) NOT NULL CHECK (weight_kg > 0 AND weight_kg <= 25),
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
  sendcloud_parcel_id         INTEGER,
  shipping_method_id          INTEGER,
  label_url                   TEXT,

  -- Payment
  stripe_payment_intent_id    TEXT,
  stripe_checkout_session_id  TEXT,

  -- Status
  status                      public.shipment_status NOT NULL DEFAULT 'payment_confirmed',
  qr_code_url                 TEXT,

  -- Timestamps
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shipments_tracking ON public.shipments(tracking_id);
CREATE INDEX idx_shipments_customer ON public.shipments(customer_id);
CREATE INDEX idx_shipments_status ON public.shipments(status);
CREATE INDEX idx_shipments_delivery_mode ON public.shipments(delivery_mode);
CREATE INDEX idx_shipments_origin ON public.shipments(origin_pickup_point_id);
CREATE INDEX idx_shipments_destination ON public.shipments(destination_pickup_point_id);
CREATE INDEX idx_shipments_created ON public.shipments(created_at DESC);
CREATE INDEX idx_shipments_stripe_session ON public.shipments(stripe_checkout_session_id);

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


-- ----- OTP VERIFICATIONS -----
-- WhatsApp OTP for final delivery verification
CREATE TABLE public.otp_verifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  otp_hash    TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  verified    BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_otp_shipment ON public.otp_verifications(shipment_id);
CREATE INDEX idx_otp_expires ON public.otp_verifications(expires_at);


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


-- ============================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications_log ENABLE ROW LEVEL SECURITY;

-- ===== PROFILES =====
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY profiles_select_admin ON public.profiles
  FOR SELECT USING (public.get_user_role() = 'admin');

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE USING (id = auth.uid());

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
