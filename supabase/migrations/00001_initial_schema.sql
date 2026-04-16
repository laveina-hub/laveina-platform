-- ============================================================
-- LAVEINA PLATFORM — COMPLETE DATABASE SCHEMA
-- Phase 1: Dual Delivery Model (Barcelona Internal + SendCloud)
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
  'express'      -- Fastest 24h carrier (optional upgrade)
);

-- Weight-based tiers (6 tiers per Pricing Report)
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
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT NOT NULL,
  phone       TEXT,
  role        public.user_role NOT NULL DEFAULT 'customer',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
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
  weight_kg                   NUMERIC(5,2) NOT NULL CHECK (weight_kg > 0 AND weight_kg <= 30),
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
  stripe_checkout_session_id  TEXT,          -- not UNIQUE: multi-parcel bookings share one session

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
CREATE INDEX idx_shipments_sendcloud_parcel ON public.shipments(sendcloud_parcel_id) WHERE sendcloud_parcel_id IS NOT NULL;
CREATE INDEX idx_shipments_customer_created ON public.shipments(customer_id, created_at DESC);

-- Generate unique tracking ID (LAV-XXXXXXXX format)
-- Defined after shipments table exists
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
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  otp_hash    TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  verified    BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
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


-- ----- WEIGHT TIER CONFIG -----
-- Weight-based pricing tiers (6 tiers per Pricing Report).
-- Customer enters actual dimensions + weight; system calculates billable weight
-- and auto-assigns the matching tier. Admin can adjust max weight per tier.
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

-- Seed Barcelona fixed prices (IVA 21% included, stored as cents)
INSERT INTO public.admin_settings (key, value) VALUES
  ('internal_price_tier_1_cents', '495'),
  ('internal_price_tier_2_cents', '675'),
  ('internal_price_tier_3_cents', '990'),
  ('internal_price_tier_4_cents', '1440'),
  ('internal_price_tier_5_cents', '1800'),
  ('internal_price_tier_6_cents', '2520')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;


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


-- ============================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcel_size_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

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
-- 9. TABLE GRANTS
-- ============================================================
-- ============================================================
-- 10. ADMIN NOTIFICATIONS
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
-- 11. TABLE GRANTS
-- ============================================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
