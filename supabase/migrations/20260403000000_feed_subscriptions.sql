-- Feed subscriptions: teams subscribe to cross-team published assets
CREATE TABLE feed_subscriptions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id           uuid NOT NULL REFERENCES published_assets(id) ON DELETE CASCADE,
  subscriber_team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  subscriber_user_id uuid REFERENCES auth.users(id),
  subscribed_at      timestamptz NOT NULL DEFAULT now(),
  status             text NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active','paused','cancelled')),
  UNIQUE(asset_id, subscriber_team_id)
);

ALTER TABLE feed_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_feed_subs_asset ON feed_subscriptions(asset_id);
CREATE INDEX idx_feed_subs_team  ON feed_subscriptions(subscriber_team_id);

-- Subscribers can read their own team's subscriptions
CREATE POLICY "team_member_select" ON feed_subscriptions FOR SELECT USING (
  subscriber_team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  )
);

-- Publishers can see who subscribes to their assets
CREATE POLICY "publisher_select" ON feed_subscriptions FOR SELECT USING (
  asset_id IN (
    SELECT id FROM published_assets WHERE team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  )
);

-- Team members can subscribe on behalf of their team
CREATE POLICY "team_member_insert" ON feed_subscriptions FOR INSERT WITH CHECK (
  subscriber_team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  )
);

-- Team members can pause/cancel their team's subscriptions
CREATE POLICY "team_member_update" ON feed_subscriptions FOR UPDATE USING (
  subscriber_team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  )
);

-- Team members can delete their team's subscriptions
CREATE POLICY "team_member_delete" ON feed_subscriptions FOR DELETE USING (
  subscriber_team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  )
);
