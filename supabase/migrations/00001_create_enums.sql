-- Laveina Platform: Custom Enum Types
-- =====================================

-- User roles for role-based access control
CREATE TYPE public.user_role AS ENUM (
  'admin',
  'pickup_point',
  'customer'
);

-- Shipping zones based on postal codes
CREATE TYPE public.zone_type AS ENUM (
  'A', 'B', 'C', 'D'
);

-- Shipment lifecycle status (7 stages)
CREATE TYPE public.shipment_status AS ENUM (
  'payment_confirmed',
  'waiting_at_origin',
  'received_at_origin',
  'in_transit',
  'arrived_at_destination',
  'ready_for_pickup',
  'delivered'
);
