-- Populate trigger_on for skills that should auto-fire on connector sync events.
-- Format: "provider:model" matches the webhook handler at /api/webhooks/:provider.

-- ============================================================================
-- Sales skills triggered by HubSpot syncs
-- ============================================================================

-- pipeline-* and deal-* skills → hubspot:deals
UPDATE skill_registry
SET trigger_on = 'hubspot:deals'
WHERE team_function = 'sales'
  AND (skill_name LIKE 'pipeline-%' OR skill_name LIKE 'deal-%')
  AND trigger_on IS NULL;

-- contact-* and lead-* skills → hubspot:contacts
UPDATE skill_registry
SET trigger_on = 'hubspot:contacts'
WHERE team_function = 'sales'
  AND (skill_name LIKE 'contact-%' OR skill_name LIKE 'lead-%')
  AND trigger_on IS NULL;

-- forecast-* skills → hubspot:deals
UPDATE skill_registry
SET trigger_on = 'hubspot:deals'
WHERE team_function = 'sales'
  AND skill_name LIKE 'forecast-%'
  AND trigger_on IS NULL;

-- crm-* skills → hubspot:deals (CRM dashboards pull from deal data)
UPDATE skill_registry
SET trigger_on = 'hubspot:deals'
WHERE team_function = 'sales'
  AND skill_name LIKE 'crm-%'
  AND trigger_on IS NULL;

-- ============================================================================
-- Marketing skills triggered by GA4 syncs
-- ============================================================================

-- campaign-* and traffic-* skills → google-analytics-4:traffic
UPDATE skill_registry
SET trigger_on = 'google-analytics-4:traffic'
WHERE team_function = 'marketing'
  AND (skill_name LIKE 'campaign-%' OR skill_name LIKE 'traffic-%')
  AND trigger_on IS NULL;

-- seo-* and analytics-* skills → google-analytics-4:traffic
UPDATE skill_registry
SET trigger_on = 'google-analytics-4:traffic'
WHERE team_function = 'marketing'
  AND (skill_name LIKE 'seo-%' OR skill_name LIKE 'analytics-%')
  AND trigger_on IS NULL;

-- ============================================================================
-- Marketing skills triggered by Mixpanel syncs
-- ============================================================================

-- funnel-* and conversion-* skills → mixpanel:events
UPDATE skill_registry
SET trigger_on = 'mixpanel:events'
WHERE team_function = 'marketing'
  AND (skill_name LIKE 'funnel-%' OR skill_name LIKE 'conversion-%')
  AND trigger_on IS NULL;

-- ============================================================================
-- Support skills triggered by HubSpot syncs
-- ============================================================================

-- ticket-* skills → hubspot:contacts
UPDATE skill_registry
SET trigger_on = 'hubspot:contacts'
WHERE team_function = 'support'
  AND skill_name LIKE 'ticket-%'
  AND trigger_on IS NULL;

-- ============================================================================
-- Data / analytics skills triggered by Airtable syncs
-- ============================================================================

-- survey-* skills → airtable:records
UPDATE skill_registry
SET trigger_on = 'airtable:records'
WHERE team_function = 'data'
  AND skill_name LIKE 'survey-%'
  AND trigger_on IS NULL;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
