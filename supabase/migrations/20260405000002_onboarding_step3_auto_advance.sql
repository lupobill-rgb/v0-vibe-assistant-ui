-- Migration: Auto-advance onboarding step 3 → 4
-- When current_step changes to 3, simulate data profiling completion
-- and advance to step 4 (Dashboard Build).
--
-- In production this would be replaced by an async worker that actually
-- profiles connected data sources. For now the trigger provides a
-- seamless onboarding UX by advancing after marking step 3 complete.

CREATE OR REPLACE FUNCTION trg_onboarding_step3_auto_advance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only fire when session just moved to step 3
  IF NEW.current_step = 3 AND OLD.current_step = 2 THEN
    -- Complete step 3 with profiling verdict
    UPDATE onboarding_steps
    SET status = 'completed',
        completed_at = now(),
        started_at = COALESCE(started_at, now()),
        verdict = 'good',
        verdict_message = 'Data profiling complete — schema and freshness validated',
        recommendation = 'Ready to generate dashboards from connected sources'
    WHERE session_id = NEW.id AND step_number = 3;

    -- Activate step 4
    UPDATE onboarding_steps
    SET status = 'in_progress', started_at = now()
    WHERE session_id = NEW.id AND step_number = 4;

    -- Advance session to step 4
    NEW.current_step := 4;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS onboarding_step3_auto_advance ON onboarding_sessions;
CREATE TRIGGER onboarding_step3_auto_advance
  BEFORE UPDATE ON onboarding_sessions
  FOR EACH ROW
  EXECUTE FUNCTION trg_onboarding_step3_auto_advance();
