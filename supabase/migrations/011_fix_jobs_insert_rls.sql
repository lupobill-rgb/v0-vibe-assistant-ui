DROP POLICY IF EXISTS jobs_insert ON jobs;

CREATE POLICY jobs_insert ON jobs
FOR INSERT TO public
WITH CHECK (
  project_id IN (
    SELECT projects.id FROM projects
    WHERE projects.team_id IN (SELECT user_team_ids() AS user_team_ids)
  )
);
