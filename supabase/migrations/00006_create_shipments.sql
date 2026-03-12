-- Shipments table: core domain entity
-- =====================================

CREATE TABLE public.shipments (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id                 TEXT NOT NULL UNIQUE,
  customer_id                 UUID NOT NULL REFERENCES public.profiles(id),
  sender_name                 TEXT NOT NULL,
  sender_phone                TEXT NOT NULL,
  receiver_name               TEXT NOT NULL,
  receiver_phone              TEXT NOT NULL,
  origin_pickup_point_id      UUID NOT NULL REFERENCES public.pickup_points(id),
  destination_pickup_point_id UUID NOT NULL REFERENCES public.pickup_points(id),
  origin_postcode             TEXT NOT NULL,
  destination_postcode        TEXT NOT NULL,
  weight_kg                   NUMERIC(5,2) NOT NULL CHECK (weight_kg > 0),
  price_cents                 INTEGER NOT NULL CHECK (price_cents > 0),
  status                      public.shipment_status NOT NULL DEFAULT 'payment_confirmed',
  stripe_payment_intent_id    TEXT,
  qr_code_url                 TEXT,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_shipments_tracking ON public.shipments(tracking_id);
CREATE INDEX idx_shipments_customer ON public.shipments(customer_id);
CREATE INDEX idx_shipments_status ON public.shipments(status);
CREATE INDEX idx_shipments_origin ON public.shipments(origin_pickup_point_id);
CREATE INDEX idx_shipments_destination ON public.shipments(destination_pickup_point_id);
CREATE INDEX idx_shipments_created ON public.shipments(created_at DESC);
