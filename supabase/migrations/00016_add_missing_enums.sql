-- Add missing enum types required by CLAUDE_PROMPT_V2
-- ====================================================

-- Region classification for surcharge logic
CREATE TYPE public.region_type AS ENUM (
  'peninsula',
  'balearic_islands',
  'canary_islands',
  'ceuta',
  'melilla'
);

-- Surcharge calculation method
CREATE TYPE public.surcharge_type AS ENUM (
  'none',
  'fixed',
  'percentage'
);
