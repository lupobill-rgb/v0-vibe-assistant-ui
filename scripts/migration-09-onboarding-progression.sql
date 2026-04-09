CREATE OR REPLACE FUNCTION initialize_onboarding(p_org_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_session_id UUID;
BEGIN
  INSERT INTO org_feature_flags (organization_id, stage) VALUES (p_org_id, 'onboarding')
  ON CONFLICT (organization_id) DO UPDATE SET stage = 'onboarding', updated_at = now();
  SELECT id INTO v_session_id FROM onboarding_sessions WHERE organization_id = p_org_id;
  IF v_session_id IS NOT NULL THEN RETURN v_session_id; END IF;
  INSERT INTO onboarding_sessions (organization_id, status, current_step) VALUES (p_org_id, 'in_progress', 1) RETURNING id INTO v_session_id;
  INSERT INTO onboarding_steps (session_id, step_number, step_name, status) VALUES
    (v_session_id, 1, 'Company Profile', 'in_progress'),
    (v_session_id, 2, 'Data Sources', 'pending'),
    (v_session_id, 3, 'Data Analysis', 'pending'),
    (v_session_id, 4, 'Dashboard Build', 'pending'),
    (v_session_id, 5, 'Go Live', 'pending');
  INSERT INTO onboarding_connectors (session_id, provider) VALUES
    (v_session_id, 'hubspot'), (v_session_id, 'salesforce'),
    (v_session_id, 'google-analytics'), (v_session_id, 'slack');
  RETURN v_session_id;
END; $$;

CREATE OR REPLACE FUNCTION trg_onboarding_step1_complete() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.current_step = 1 AND NEW.company_name IS NOT NULL AND NEW.primary_use_case IS NOT NULL
     AND (OLD.company_name IS NULL OR OLD.primary_use_case IS NULL) THEN
    UPDATE onboarding_steps SET status = 'completed', completed_at = now() WHERE session_id = NEW.id AND step_number = 1;
    UPDATE onboarding_steps SET status = 'in_progress', started_at = now() WHERE session_id = NEW.id AND step_number = 2;
    NEW.current_step := 2;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS onboarding_step1_complete ON onboarding_sessions;
CREATE TRIGGER onboarding_step1_complete BEFORE UPDATE ON onboarding_sessions FOR EACH ROW EXECUTE FUNCTION trg_onboarding_step1_complete();

CREATE OR REPLACE FUNCTION trg_onboarding_connectors_check() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_session_id UUID; v_current_step INTEGER; v_pending_count INTEGER; v_connected_count INTEGER;
BEGIN
  v_session_id := NEW.session_id;
  SELECT current_step INTO v_current_step FROM onboarding_sessions WHERE id = v_session_id;
  IF v_current_step != 2 THEN RETURN NEW; END IF;
  SELECT COUNT(*) INTO v_pending_count FROM onboarding_connectors WHERE session_id = v_session_id AND status IN ('available', 'connecting');
  SELECT COUNT(*) INTO v_connected_count FROM onboarding_connectors WHERE session_id = v_session_id AND status = 'connected';
  IF v_pending_count = 0 AND v_connected_count >= 1 THEN
    UPDATE onboarding_steps SET status = 'completed', completed_at = now(), verdict = 'good', verdict_message = v_connected_count || ' data source(s) connected successfully' WHERE session_id = v_session_id AND step_number = 2;
    UPDATE onboarding_steps SET status = 'in_progress', started_at = now() WHERE session_id = v_session_id AND step_number = 3;
    UPDATE onboarding_sessions SET current_step = 3 WHERE id = v_session_id;
  ELSIF v_pending_count = 0 AND v_connected_count = 0 THEN
    UPDATE onboarding_steps SET status = 'completed', completed_at = now(), verdict = 'neutral', verdict_message = 'No data sources connected - using sample data' WHERE session_id = v_session_id AND step_number = 2;
    UPDATE onboarding_steps SET status = 'in_progress', started_at = now() WHERE session_id = v_session_id AND step_number = 3;
    UPDATE onboarding_sessions SET current_step = 3 WHERE id = v_session_id;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS onboarding_connectors_check ON onboarding_connectors;
CREATE TRIGGER onboarding_connectors_check AFTER UPDATE ON onboarding_connectors FOR EACH ROW EXECUTE FUNCTION trg_onboarding_connectors_check();

CREATE OR REPLACE FUNCTION advance_onboarding_step(p_session_id UUID, p_from_step INTEGER, p_verdict TEXT DEFAULT 'good', p_verdict_message TEXT DEFAULT NULL, p_recommendation TEXT DEFAULT NULL)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_current_step INTEGER; v_next_step INTEGER;
BEGIN
  SELECT current_step INTO v_current_step FROM onboarding_sessions WHERE id = p_session_id;
  IF v_current_step IS NULL OR v_current_step != p_from_step THEN RETURN FALSE; END IF;
  v_next_step := p_from_step + 1;
  UPDATE onboarding_steps SET status = 'completed', completed_at = now(), verdict = p_verdict, verdict_message = p_verdict_message, recommendation = p_recommendation WHERE session_id = p_session_id AND step_number = p_from_step;
  IF v_next_step <= 5 THEN
    UPDATE onboarding_steps SET status = 'in_progress', started_at = now() WHERE session_id = p_session_id AND step_number = v_next_step;
    UPDATE onboarding_sessions SET current_step = v_next_step WHERE id = p_session_id;
  END IF;
  IF p_from_step = 5 THEN
    UPDATE onboarding_steps SET status = 'completed', completed_at = now(), verdict = p_verdict, verdict_message = COALESCE(p_verdict_message, 'Onboarding complete') WHERE session_id = p_session_id AND step_number = 5;
    UPDATE onboarding_sessions SET status = 'completed', completed_at = now(), overall_verdict = p_verdict, verdict_summary = COALESCE(p_verdict_message, 'Your workspace is ready') WHERE id = p_session_id;
    UPDATE org_feature_flags SET stage = 'active', updated_at = now() WHERE organization_id = (SELECT organization_id FROM onboarding_sessions WHERE id = p_session_id);
  END IF;
  RETURN TRUE;
END; $$;

CREATE OR REPLACE FUNCTION complete_onboarding(p_session_id UUID) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN RETURN advance_onboarding_step(p_session_id, 5, 'good', 'All systems operational - your workspace is live'); END; $$;
