-- Database Triggers
-- =================

-- Auto-set updated_at on profiles
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Auto-set updated_at on pickup_points
CREATE TRIGGER set_pickup_points_updated_at
  BEFORE UPDATE ON public.pickup_points
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Auto-set updated_at on pricing_rules
CREATE TRIGGER set_pricing_rules_updated_at
  BEFORE UPDATE ON public.pricing_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Auto-set updated_at on shipments
CREATE TRIGGER set_shipments_updated_at
  BEFORE UPDATE ON public.shipments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Auto-generate tracking_id on shipment insert
CREATE TRIGGER set_shipment_tracking_id
  BEFORE INSERT ON public.shipments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tracking_id();

-- Validate status transitions on shipment update
CREATE TRIGGER validate_shipment_status
  BEFORE UPDATE OF status ON public.shipments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_status_transition();

-- ===== Helper functions used by triggers =====

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.set_tracking_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tracking_id IS NULL OR NEW.tracking_id = '' THEN
    NEW.tracking_id := public.generate_tracking_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
