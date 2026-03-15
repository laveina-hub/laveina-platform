-- Notifications Log table: WhatsApp message audit trail
-- ======================================================
-- Tracks every WhatsApp message sent via Gallabox.

CREATE TABLE public.notifications_log (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id         UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  recipient_phone     TEXT NOT NULL,
  template_name       TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending',
  sent_at             TIMESTAMPTZ,
  gallabox_message_id TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_notifications_log_shipment ON public.notifications_log(shipment_id);
CREATE INDEX idx_notifications_log_status ON public.notifications_log(status);

-- RLS
ALTER TABLE public.notifications_log ENABLE ROW LEVEL SECURITY;

-- Admins can read/manage all notifications
CREATE POLICY notifications_log_admin_all ON public.notifications_log
  FOR ALL USING (public.get_user_role() = 'admin');

-- Customers can read notifications for their own shipments
CREATE POLICY notifications_log_select_own ON public.notifications_log
  FOR SELECT USING (
    shipment_id IN (SELECT id FROM public.shipments WHERE customer_id = auth.uid())
  );
