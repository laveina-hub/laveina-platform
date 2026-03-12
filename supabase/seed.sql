-- Seed Data for Development
-- =========================

-- Sample Barcelona postcodes with zone mapping
INSERT INTO public.postcodes (code, zone, city, region) VALUES
  ('08001', 'A', 'Barcelona', 'Ciutat Vella'),
  ('08002', 'A', 'Barcelona', 'Barri Gòtic'),
  ('08003', 'A', 'Barcelona', 'Barceloneta'),
  ('08004', 'A', 'Barcelona', 'Poble-sec'),
  ('08005', 'A', 'Barcelona', 'Vila Olímpica'),
  ('08006', 'A', 'Barcelona', 'Gràcia'),
  ('08007', 'A', 'Barcelona', 'Eixample'),
  ('08008', 'A', 'Barcelona', 'Eixample'),
  ('08009', 'A', 'Barcelona', 'Eixample'),
  ('08010', 'A', 'Barcelona', 'Eixample'),
  ('08015', 'B', 'Barcelona', 'Sant Antoni'),
  ('08017', 'B', 'Barcelona', 'Sarrià'),
  ('08018', 'B', 'Barcelona', 'Poblenou'),
  ('08019', 'B', 'Barcelona', 'Sant Martí'),
  ('08020', 'B', 'Barcelona', 'Sant Martí'),
  ('08024', 'B', 'Barcelona', 'Gràcia'),
  ('08028', 'B', 'Barcelona', 'Les Corts'),
  ('08034', 'B', 'Barcelona', 'Pedralbes'),
  ('08035', 'C', 'Barcelona', 'Horta'),
  ('08036', 'C', 'Barcelona', 'Eixample'),
  ('08040', 'C', 'Barcelona', 'Zona Franca'),
  ('08041', 'C', 'Barcelona', 'Horta-Guinardó'),
  ('08042', 'C', 'Barcelona', 'Canyelles'),
  ('08100', 'C', 'Mollet del Vallès', 'Vallès Oriental'),
  ('08110', 'C', 'Montcada i Reixac', 'Vallès Occidental'),
  ('08170', 'D', 'Montornès del Vallès', 'Vallès Oriental'),
  ('08190', 'D', 'Sant Cugat', 'Vallès Occidental'),
  ('08201', 'D', 'Sabadell', 'Vallès Occidental'),
  ('08301', 'D', 'Mataró', 'Maresme'),
  ('08401', 'D', 'Granollers', 'Vallès Oriental')
ON CONFLICT (code) DO NOTHING;

-- Sample pricing rules (in euro cents)
INSERT INTO public.pricing_rules (origin_zone, destination_zone, min_weight_kg, max_weight_kg, price_cents) VALUES
  -- Zone A to A (city center)
  ('A', 'A', 0, 5, 350),
  ('A', 'A', 5, 10, 500),
  ('A', 'A', 10, 20, 750),
  ('A', 'A', 20, 30, 1000),
  -- Zone A to B
  ('A', 'B', 0, 5, 450),
  ('A', 'B', 5, 10, 650),
  ('A', 'B', 10, 20, 900),
  ('A', 'B', 20, 30, 1200),
  -- Zone A to C
  ('A', 'C', 0, 5, 550),
  ('A', 'C', 5, 10, 800),
  ('A', 'C', 10, 20, 1100),
  ('A', 'C', 20, 30, 1500),
  -- Zone A to D
  ('A', 'D', 0, 5, 700),
  ('A', 'D', 5, 10, 1000),
  ('A', 'D', 10, 20, 1400),
  ('A', 'D', 20, 30, 1800),
  -- Zone B to B
  ('B', 'B', 0, 5, 400),
  ('B', 'B', 5, 10, 550),
  ('B', 'B', 10, 20, 800),
  ('B', 'B', 20, 30, 1050)
ON CONFLICT DO NOTHING;
