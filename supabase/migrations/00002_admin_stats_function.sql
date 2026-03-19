-- Migration: Add get_admin_dashboard_stats() RPC function
-- Performs all admin dashboard aggregations in a single DB round-trip.
-- Returns a JSON object with counts per status + total revenue.

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT jsonb_build_object(
    'total_shipments',    COUNT(*),
    'waiting_at_origin',  COUNT(*) FILTER (WHERE status = 'waiting_at_origin'),
    'received_at_origin', COUNT(*) FILTER (WHERE status = 'received_at_origin'),
    'in_transit',         COUNT(*) FILTER (WHERE status = 'in_transit'),
    'arrived_at_destination', COUNT(*) FILTER (WHERE status = 'arrived_at_destination'),
    'ready_for_pickup',   COUNT(*) FILTER (WHERE status = 'ready_for_pickup'),
    'delivered',          COUNT(*) FILTER (WHERE status = 'delivered'),
    'total_revenue_cents', COALESCE(SUM(price_cents), 0),
    'active_pickup_points', (
      SELECT COUNT(*) FROM public.pickup_points WHERE is_active = true
    )
  )
  FROM public.shipments;
$$;

-- Grant access so the API can call it via authenticated client
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_stats() TO authenticated;
