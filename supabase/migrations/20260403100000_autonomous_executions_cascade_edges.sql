-- Reactive Kernel: autonomous execution log + cascade tracing

CREATE TABLE autonomous_executions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizations(id),
  team_id          uuid NOT NULL REFERENCES teams(id),
  skill_id         uuid NOT NULL REFERENCES skill_registry(id),
  trigger_source   text NOT NULL,
  trigger_event    text NOT NULL,
  trigger_payload  jsonb,
  job_id           uuid REFERENCES jobs(id),
  status           text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','running','complete','failed')),
  created_at       timestamptz DEFAULT now(),
  completed_at     timestamptz
);

ALTER TABLE autonomous_executions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_auto_exec_org_created ON autonomous_executions(organization_id, created_at DESC);
CREATE INDEX idx_auto_exec_skill       ON autonomous_executions(skill_id);

-- SELECT: org members only
CREATE POLICY "org_member_select" ON autonomous_executions FOR SELECT USING (
  organization_id IN (
    SELECT org_id FROM org_members WHERE user_id = auth.uid()
  )
);

-- INSERT: service_role only (no user-facing policy)

CREATE TABLE cascade_edges (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid NOT NULL REFERENCES organizations(id),
  source_execution_id   uuid NOT NULL REFERENCES autonomous_executions(id),
  target_execution_id   uuid NOT NULL REFERENCES autonomous_executions(id),
  source_skill_id       uuid NOT NULL REFERENCES skill_registry(id),
  target_skill_id       uuid NOT NULL REFERENCES skill_registry(id),
  feed_subscription_id  uuid,
  created_at            timestamptz DEFAULT now()
);

ALTER TABLE cascade_edges ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_cascade_source ON cascade_edges(source_execution_id);
CREATE INDEX idx_cascade_org_created ON cascade_edges(organization_id, created_at DESC);

-- SELECT: org members only
CREATE POLICY "org_member_select" ON cascade_edges FOR SELECT USING (
  organization_id IN (
    SELECT org_id FROM org_members WHERE user_id = auth.uid()
  )
);

-- INSERT: service_role only (no user-facing policy)
-- No UPDATE/DELETE: append-only audit log
