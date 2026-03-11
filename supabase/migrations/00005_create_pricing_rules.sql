-- Pricing Rules table: zone-to-zone pricing by weight tier
-- ========================================================

CREATE TABLE public.pricing_rules (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_zone       public.zone_type NOT NULL,
  destination_zone  public.zone_type NOT NULL,
  min_weight_kg     NUMERIC(5,2) NOT NULL DEFAULT 0,
  max_weight_kg     NUMERIC(5,2) NOT NULL,
  price_cents       INTEGER NOT NULL CHECK (price_cents > 0),
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for price lookups
CREATE INDEX idx_pricing_rules_zones ON public.pricing_rules(origin_zone, destination_zone);
CREATE INDEX idx_pricing_rules_active ON public.pricing_rules(is_active);

-- Unique constraint: one rule per zone pair + weight tier
CREATE UNIQUE INDEX idx_pricing_rules_unique
  ON public.pricing_rules(origin_zone, destination_zone, min_weight_kg, max_weight_kg)
  WHERE is_active = true;
