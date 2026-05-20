-- ============================================================
-- 00002 — Add `cancelled` to the shipment_status state machine
-- ============================================================
-- The 7-stage flow in PLATFORM_FLOW.md §7 covers the happy path only.
-- Admin cancel needs a terminal "cancelled" state so the local row reflects
-- reality after a SendCloud cancel succeeds (or for Barcelona parcels where
-- the admin pulls the parcel back before pickup). Without this, the cancel
-- route only called SendCloud and the local row stayed at its previous
-- status forever — see audit finding H4.
--
-- Cancel is allowed from any pre-delivered state. Once `cancelled`, the row
-- is terminal (matches `delivered` semantics).
--
-- Safe rollout: enum extensions are non-blocking in Postgres 12+; the
-- trigger replacement is atomic within this migration.

-- 1. Add the enum value. ALTER TYPE ... ADD VALUE cannot run inside a
--    transaction block in older Postgres, but Supabase migrations execute
--    each file in its own connection, so this is fine standalone.
ALTER TYPE public.shipment_status ADD VALUE IF NOT EXISTS 'cancelled';

-- 2. Replace the validation trigger to allow cancel from any pre-delivered
--    state. Mirrors `STATUS_TRANSITIONS` / `CANCELLABLE_STATUSES` in
--    src/constants/status-transitions.ts so the DB and app agree.
CREATE OR REPLACE FUNCTION public.validate_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Cancel is allowed from any non-terminal happy-path state.
  IF NEW.status = 'cancelled' THEN
    IF OLD.status IN (
      'payment_confirmed',
      'waiting_at_origin',
      'received_at_origin',
      'in_transit',
      'arrived_at_destination',
      'ready_for_pickup'
    ) THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Cannot cancel shipment from terminal state %', OLD.status;
  END IF;

  IF NOT (
    (OLD.status = 'payment_confirmed'     AND NEW.status = 'waiting_at_origin') OR
    (OLD.status = 'waiting_at_origin'     AND NEW.status = 'received_at_origin') OR
    (OLD.status = 'received_at_origin'    AND NEW.status = 'in_transit') OR
    (OLD.status = 'in_transit'            AND NEW.status = 'arrived_at_destination') OR
    (OLD.status = 'arrived_at_destination' AND NEW.status = 'ready_for_pickup') OR
    (OLD.status = 'ready_for_pickup'      AND NEW.status = 'delivered')
  ) THEN
    RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
