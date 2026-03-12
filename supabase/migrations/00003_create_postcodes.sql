-- Postcodes table: maps postal codes to zones
-- ==============================================

CREATE TABLE public.postcodes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT NOT NULL UNIQUE,
  zone        public.zone_type NOT NULL,
  city        TEXT,
  region      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast postcode lookups
CREATE INDEX idx_postcodes_code ON public.postcodes(code);
CREATE INDEX idx_postcodes_zone ON public.postcodes(zone);
