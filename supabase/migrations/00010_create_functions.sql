-- Database Functions
-- ==================

-- Generate unique tracking ID (LAV-XXXXXXXX format)
CREATE OR REPLACE FUNCTION public.generate_tracking_id()
RETURNS TEXT AS $$
DECLARE
  new_id TEXT;
  exists_already BOOLEAN;
BEGIN
  LOOP
    -- Generate: LAV- + 8 alphanumeric chars
    new_id := 'LAV-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));

    -- Check uniqueness
    SELECT EXISTS(SELECT 1 FROM public.shipments WHERE tracking_id = new_id) INTO exists_already;

    EXIT WHEN NOT exists_already;
  END LOOP;

  RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- Validate shipment status transitions
CREATE OR REPLACE FUNCTION public.validate_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Only validate if status is changing
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Check valid transitions
  IF NOT (
    (OLD.status = 'payment_confirmed' AND NEW.status = 'waiting_at_origin') OR
    (OLD.status = 'waiting_at_origin' AND NEW.status = 'received_at_origin') OR
    (OLD.status = 'received_at_origin' AND NEW.status = 'in_transit') OR
    (OLD.status = 'in_transit' AND NEW.status = 'arrived_at_destination') OR
    (OLD.status = 'arrived_at_destination' AND NEW.status = 'ready_for_pickup') OR
    (OLD.status = 'ready_for_pickup' AND NEW.status = 'delivered')
  ) THEN
    RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
