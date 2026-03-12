-- Row Level Security Policies
-- ===========================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.postcodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ===== PROFILES =====
-- Users can read their own profile
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT USING (id = auth.uid());

-- Admins can read all profiles
CREATE POLICY profiles_select_admin ON public.profiles
  FOR SELECT USING (public.get_user_role() = 'admin');

-- Users can update their own profile
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE USING (id = auth.uid());

-- ===== POSTCODES =====
-- Everyone can read postcodes (needed for booking)
CREATE POLICY postcodes_select_all ON public.postcodes
  FOR SELECT USING (true);

-- Only admins can manage postcodes
CREATE POLICY postcodes_admin_all ON public.postcodes
  FOR ALL USING (public.get_user_role() = 'admin');

-- ===== PICKUP POINTS =====
-- Everyone can read active pickup points
CREATE POLICY pickup_points_select_active ON public.pickup_points
  FOR SELECT USING (is_active = true);

-- Admins can manage all pickup points
CREATE POLICY pickup_points_admin_all ON public.pickup_points
  FOR ALL USING (public.get_user_role() = 'admin');

-- Pickup point owners can update their own
CREATE POLICY pickup_points_owner_update ON public.pickup_points
  FOR UPDATE USING (owner_id = auth.uid());

-- ===== PRICING RULES =====
-- Everyone can read active pricing rules
CREATE POLICY pricing_rules_select_active ON public.pricing_rules
  FOR SELECT USING (is_active = true);

-- Admins can manage pricing rules
CREATE POLICY pricing_rules_admin_all ON public.pricing_rules
  FOR ALL USING (public.get_user_role() = 'admin');

-- ===== SHIPMENTS =====
-- Customers can read their own shipments
CREATE POLICY shipments_select_own ON public.shipments
  FOR SELECT USING (customer_id = auth.uid());

-- Admins can read all shipments
CREATE POLICY shipments_select_admin ON public.shipments
  FOR SELECT USING (public.get_user_role() = 'admin');

-- Pickup point staff can read shipments for their pickup point
CREATE POLICY shipments_select_pickup_point ON public.shipments
  FOR SELECT USING (
    public.get_user_role() = 'pickup_point'
    AND (
      origin_pickup_point_id IN (SELECT id FROM public.pickup_points WHERE owner_id = auth.uid())
      OR destination_pickup_point_id IN (SELECT id FROM public.pickup_points WHERE owner_id = auth.uid())
    )
  );

-- ===== SCAN LOGS =====
-- Same read access as shipments
CREATE POLICY scan_logs_select_admin ON public.scan_logs
  FOR SELECT USING (public.get_user_role() = 'admin');

CREATE POLICY scan_logs_select_own ON public.scan_logs
  FOR SELECT USING (
    shipment_id IN (SELECT id FROM public.shipments WHERE customer_id = auth.uid())
  );

-- Pickup point staff and admins can insert scan logs
CREATE POLICY scan_logs_insert ON public.scan_logs
  FOR INSERT WITH CHECK (
    public.get_user_role() IN ('admin', 'pickup_point')
  );

-- ===== OTP VERIFICATIONS =====
-- Only admins and pickup point staff can access
CREATE POLICY otp_admin_all ON public.otp_verifications
  FOR ALL USING (public.get_user_role() IN ('admin', 'pickup_point'));
