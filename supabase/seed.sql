-- ============================================================
-- LAVEINA PLATFORM — SEED DATA
-- ============================================================

-- Insurance options (Laveina's own tiers — used for Barcelona internal)
-- €25 included free, higher tiers add surcharge
INSERT INTO public.insurance_options (coverage_amount_cents, surcharge_cents, is_active, display_order) VALUES
  (2500,  0,   true, 1),   -- €25  | included
  (5000,  100, true, 2),   -- €50  | +€1
  (10000, 200, true, 3),   -- €100 | +€2
  (20000, 300, true, 4)    -- €200 | +€3
ON CONFLICT DO NOTHING;

-- Admin settings (defaults — admin can change from dashboard)
INSERT INTO public.admin_settings (key, value) VALUES
  ('margin_percentage', '25'),
  ('min_price_cents', '400'),
  ('barcelona_postcode_prefix', '080'),
  ('barcelona_express_enabled', 'false'),
  ('barcelona_prices', '{"small":0,"medium":0,"large":0,"extra_large":0,"xxl":0}'),
  ('barcelona_express_prices', '{"small":0,"medium":0,"large":0,"extra_large":0,"xxl":0}'),
  ('sendcloud_sender_address', '{"name":"Laveina","address":"","city":"","postcode":"","phone":""}')
ON CONFLICT (key) DO NOTHING;

-- NOTE: Barcelona prices are set to 0 (TBD from client).
-- Admin must update these from /admin/settings before Barcelona shipments work.
-- SendCloud sender address must also be filled with real Laveina office address.
