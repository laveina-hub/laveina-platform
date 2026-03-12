-- Pickup Points table: partner shop locations
-- =============================================

CREATE TABLE public.pickup_points (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  address         TEXT NOT NULL,
  postcode        TEXT NOT NULL REFERENCES public.postcodes(code),
  latitude        DOUBLE PRECISION NOT NULL,
  longitude       DOUBLE PRECISION NOT NULL,
  phone           TEXT,
  email           TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  is_open         BOOLEAN NOT NULL DEFAULT true,
  working_hours   JSONB,
  owner_id        UUID REFERENCES public.profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for filtering
CREATE INDEX idx_pickup_points_postcode ON public.pickup_points(postcode);
CREATE INDEX idx_pickup_points_active_open ON public.pickup_points(is_active, is_open);
CREATE INDEX idx_pickup_points_owner ON public.pickup_points(owner_id);
