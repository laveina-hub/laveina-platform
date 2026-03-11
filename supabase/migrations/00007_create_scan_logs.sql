-- Scan Logs table: full audit trail for every QR scan
-- ====================================================

CREATE TABLE public.scan_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id     UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  scanned_by      UUID NOT NULL REFERENCES public.profiles(id),
  pickup_point_id UUID REFERENCES public.pickup_points(id),
  old_status      public.shipment_status NOT NULL,
  new_status      public.shipment_status NOT NULL,
  scanned_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for log queries
CREATE INDEX idx_scan_logs_shipment ON public.scan_logs(shipment_id);
CREATE INDEX idx_scan_logs_scanned_by ON public.scan_logs(scanned_by);
CREATE INDEX idx_scan_logs_scanned_at ON public.scan_logs(scanned_at DESC);
