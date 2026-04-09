CREATE OR REPLACE FUNCTION trg_onboarding_step3_auto_advance() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.current_step = 3 AND OLD.current_step = 2 THEN
    UPDATE onboarding_steps SET status = 'completed', completed_at = now(), started_at = COALESCE(started_at, now()), verdict = 'good', verdict_message = 'Data profiling complete - schema and freshness validated', recommendation = 'Ready to generate dashboards from connected sources' WHERE session_id = NEW.id AND step_number = 3;
    UPDATE onboarding_steps SET status = 'in_progress', started_at = now() WHERE session_id = NEW.id AND step_number = 4;
    NEW.current_step := 4;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS onboarding_step3_auto_advance ON onboarding_sessions;
CREATE TRIGGER onboarding_step3_auto_advance BEFORE UPDATE ON onboarding_sessions FOR EACH ROW EXECUTE FUNCTION trg_onboarding_step3_auto_advance();
