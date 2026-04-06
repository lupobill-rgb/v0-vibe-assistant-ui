-- Add Executive team to each existing org
INSERT INTO teams (id, name, org_id, slug)
SELECT gen_random_uuid(), 'Executive', id, 'executive'
FROM organizations
ON CONFLICT DO NOTHING;
