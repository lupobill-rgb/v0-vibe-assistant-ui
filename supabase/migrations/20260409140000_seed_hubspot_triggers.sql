UPDATE skill_registry
SET trigger_on = '{"provider": "hubspot", "sync": "deals"}'::jsonb,
    autonomous_enabled = true
WHERE team_function = 'sales'
AND skill_name IN ('pipeline-review', 'forecast', 'crm-dashboard', 'daily-briefing');

UPDATE skill_registry
SET trigger_on = '{"provider": "hubspot", "sync": "contacts"}'::jsonb,
    autonomous_enabled = true
WHERE team_function = 'sales'
AND skill_name IN ('account-research', 'call-prep', 'draft-outreach');
