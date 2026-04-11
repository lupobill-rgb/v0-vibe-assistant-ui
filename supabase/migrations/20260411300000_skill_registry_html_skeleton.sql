-- Migration: Add html_skeleton column to skill_registry for deterministic template execution.
-- When html_skeleton is populated, the template path bypasses LLM generation entirely.
-- Brand tokens ({{BRAND_*}}) are replaced at build time. vibeLoadData() calls are pre-wired.

ALTER TABLE skill_registry
  ADD COLUMN IF NOT EXISTS html_skeleton TEXT;

COMMENT ON COLUMN skill_registry.html_skeleton IS
  'Pre-built HTML for deterministic template execution. When present, bypasses LLM generation. '
  'Supports {{BRAND_PRIMARY}}, {{BRAND_BG}}, {{BRAND_SURFACE}}, {{BRAND_BORDER}}, {{BRAND_TEXT}}, '
  '{{BRAND_FONT_HEADING}}, {{BRAND_FONT_BODY}}, {{BRAND_COMPANY}}, {{BRAND_TEAM}} injection markers.';

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
