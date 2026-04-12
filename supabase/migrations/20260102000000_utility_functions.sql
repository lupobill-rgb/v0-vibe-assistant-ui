-- Utility functions used by triggers in later migrations.
-- This must run before any migration that references set_updated_at().

CREATE OR REPLACE FUNCTION public.set_updated_at()
  RETURNS trigger
  LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
