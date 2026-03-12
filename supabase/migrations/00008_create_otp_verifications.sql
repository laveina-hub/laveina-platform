-- OTP Verifications table: WhatsApp OTP for final delivery
-- =========================================================

CREATE TABLE public.otp_verifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  otp_hash    TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  verified    BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for OTP lookups
CREATE INDEX idx_otp_shipment ON public.otp_verifications(shipment_id);
CREATE INDEX idx_otp_expires ON public.otp_verifications(expires_at);
