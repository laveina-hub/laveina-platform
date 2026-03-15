-- Add Stripe checkout session ID to shipments
-- =============================================
-- Needed for reconciliation: payment_intent comes from webhook,
-- checkout_session is created in the API route.

ALTER TABLE public.shipments
  ADD COLUMN stripe_checkout_session_id TEXT;

CREATE INDEX idx_shipments_stripe_session ON public.shipments(stripe_checkout_session_id);
