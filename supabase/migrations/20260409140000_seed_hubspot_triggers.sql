-- Seed HubSpot triggers for Sales skills in skill_registry
-- Idempotent: UPDATEs are safe to re-run

-- 1. Pipeline / deal skills → deals sync
UPDATE skill_registry
SET trigger_on = '{"provider": "hubspot", "sync": "deals"}'::jsonb,
    autonomous_enabled = true
WHERE department = 'Sales'
  AND (name ILIKE '%pipeline%' OR name ILIKE '%deal%');

-- 2. Contact / CRM skills → contacts sync
UPDATE skill_registry
SET trigger_on = '{"provider": "hubspot", "sync": "contacts"}'::jsonb,
    autonomous_enabled = true
WHERE department = 'Sales'
  AND (name ILIKE '%contact%' OR name ILIKE '%crm%');

-- 3. Forecast / revenue skills → deals sync
UPDATE skill_registry
SET trigger_on = '{"provider": "hubspot", "sync": "deals"}'::jsonb,
    autonomous_enabled = true
WHERE department = 'Sales'
  AND (name ILIKE '%forecast%' OR name ILIKE '%revenue%');

-- 4. Win/loss skills → deals sync
UPDATE skill_registry
SET trigger_on = '{"provider": "hubspot", "sync": "deals"}'::jsonb,
    autonomous_enabled = true
WHERE department = 'Sales'
  AND (name ILIKE '%win%' OR name ILIKE '%loss%' OR name ILIKE '%won%');
