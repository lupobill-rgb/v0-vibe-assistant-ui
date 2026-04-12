-- Migration: Create reusable set_updated_at() trigger function.
-- Must exist before any migration that uses EXECUTE FUNCTION public.set_updated_at().

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
