-- ============================================================
-- LAVEINA PLATFORM — SEED DATA
-- ============================================================

-- Parcel size config (dimensions and max weight per size — admin-editable)
-- Source: PARCEL_JOURNEY.md confirmed values (2026-03-18)
-- Admin can update from /admin/settings. Prices are stored separately in admin_settings.
INSERT INTO public.parcel_size_config (size, max_weight_kg, length_cm, width_cm, height_cm) VALUES
  ('small',       2,  30, 20, 20),
  ('medium',      5,  35, 35, 24),
  ('large',       10, 40, 40, 37),
  ('extra_large', 20, 55, 55, 39),
  ('xxl',         25, 55, 60, 39)
ON CONFLICT (size) DO NOTHING;


-- Insurance options (Laveina's own tiers — used for Barcelona internal)
-- €25 included free, higher tiers add surcharge
INSERT INTO public.insurance_options (coverage_amount_cents, surcharge_cents, is_active, display_order) VALUES
  (2500,  0,   true, 1),   -- €25  | included
  (5000,  100, true, 2),   -- €50  | +€1
  (10000, 200, true, 3),   -- €100 | +€2
  (20000, 300, true, 4)    -- €200 | +€3
ON CONFLICT DO NOTHING;

-- Admin settings (defaults — admin can change from /admin/settings dashboard)
-- Key naming convention used by pricing.service.ts:
--   internal_price_<size>_cents   — flat price per size for Barcelona internal routes
--   sendcloud_margin_percent       — % margin applied on top of carrier rate (default 25)
-- Mock values below are for local development. Client must provide real Barcelona prices.
INSERT INTO public.admin_settings (key, value) VALUES
  -- SendCloud carrier margin (applied to raw carrier rate before IVA)
  ('sendcloud_margin_percent',        '25'),
  -- Barcelona internal prices (mock — update with real client prices before launch)
  ('internal_price_small_cents',      '300'),    -- €3.00
  ('internal_price_medium_cents',     '500'),    -- €5.00
  ('internal_price_large_cents',      '800'),    -- €8.00
  ('internal_price_extra_large_cents','1200'),   -- €12.00
  ('internal_price_xxl_cents',        '1800'),   -- €18.00
  -- SendCloud sender (Laveina office) — fill with real address before launch
  ('sendcloud_sender_name',    'Laveina'),
  ('sendcloud_sender_address', ''),
  ('sendcloud_sender_city',    'Barcelona'),
  ('sendcloud_sender_postcode','08001'),
  ('sendcloud_sender_phone',   '')
ON CONFLICT (key) DO NOTHING;
