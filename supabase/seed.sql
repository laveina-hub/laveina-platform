-- Seed Data
-- =========

-- Insurance options (fixed tiers — client confirmed 2025-03-11)
-- €25 included free, higher tiers add surcharge
INSERT INTO public.insurance_options (coverage_amount_cents, surcharge_cents, is_active, display_order) VALUES
  (2500,  0,   true, 1),   -- €25  | included
  (5000,  100, true, 2),   -- €50  | +€1
  (10000, 200, true, 3),   -- €100 | +€2
  (20000, 300, true, 4)    -- €200 | +€3
ON CONFLICT DO NOTHING;

-- TODO: Add postcodes seed data once client confirms zone assignment rules (province → zone)
-- TODO: Add pricing_rules seed data once client provides the price matrix (zone × weight tier)
