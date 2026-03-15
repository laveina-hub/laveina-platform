-- Insurance Options table: fixed coverage tiers for shipments
-- ============================================================
-- Business rule: €25 included free, higher tiers cost extra.
-- Admin-editable from dashboard (insurance companies may change terms).

CREATE TABLE public.insurance_options (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coverage_amount_cents INTEGER NOT NULL CHECK (coverage_amount_cents > 0),
  surcharge_cents      INTEGER NOT NULL DEFAULT 0 CHECK (surcharge_cents >= 0),
  is_active            BOOLEAN NOT NULL DEFAULT true,
  display_order        INTEGER NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for active options ordered by display
CREATE INDEX idx_insurance_options_active ON public.insurance_options(is_active, display_order);

-- Updated_at trigger (reuses the function from 00011)
CREATE TRIGGER set_insurance_options_updated_at
  BEFORE UPDATE ON public.insurance_options
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS
ALTER TABLE public.insurance_options ENABLE ROW LEVEL SECURITY;

-- Everyone can read active insurance options (needed during booking)
CREATE POLICY insurance_options_select_active ON public.insurance_options
  FOR SELECT USING (is_active = true);

-- Admins can manage all insurance options
CREATE POLICY insurance_options_admin_all ON public.insurance_options
  FOR ALL USING (public.get_user_role() = 'admin');
