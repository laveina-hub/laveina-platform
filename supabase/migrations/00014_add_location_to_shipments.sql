-- Add resolved location fields to shipments table
-- =================================================
-- Google Maps resolves postcode → city/province at booking time.
-- We persist this so each shipment keeps correct pricing data
-- even if the external service changes later.

ALTER TABLE public.shipments
  ADD COLUMN origin_city        TEXT,
  ADD COLUMN origin_province    TEXT,
  ADD COLUMN origin_zone        public.zone_type,
  ADD COLUMN destination_city   TEXT,
  ADD COLUMN destination_province TEXT,
  ADD COLUMN destination_zone   public.zone_type;

-- Indexes for zone-based filtering in admin dashboard
CREATE INDEX idx_shipments_origin_zone ON public.shipments(origin_zone);
CREATE INDEX idx_shipments_destination_zone ON public.shipments(destination_zone);
