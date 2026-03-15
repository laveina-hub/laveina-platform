-- Add surcharge fields to pricing_rules table
-- =============================================
-- Supports special region surcharges (Balearics, Canaries, Ceuta, Melilla).

ALTER TABLE public.pricing_rules
  ADD COLUMN surcharge_type   public.surcharge_type NOT NULL DEFAULT 'none',
  ADD COLUMN surcharge_amount INTEGER NOT NULL DEFAULT 0;
