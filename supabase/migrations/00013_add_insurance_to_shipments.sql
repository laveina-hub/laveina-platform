-- Add insurance fields to shipments table
-- ========================================
-- Each shipment stores: selected coverage, surcharge paid, and FK to option.

ALTER TABLE public.shipments
  ADD COLUMN insurance_option_id      UUID REFERENCES public.insurance_options(id),
  ADD COLUMN insurance_amount_cents   INTEGER NOT NULL DEFAULT 2500,
  ADD COLUMN insurance_surcharge_cents INTEGER NOT NULL DEFAULT 0;

-- Index for insurance lookups / reporting
CREATE INDEX idx_shipments_insurance ON public.shipments(insurance_option_id);
