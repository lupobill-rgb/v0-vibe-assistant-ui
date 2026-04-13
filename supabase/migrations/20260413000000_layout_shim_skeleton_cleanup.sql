-- Canonical fix for the Apr 11–12 skeleton layout regression.
--
-- Companion to apps/api/src/handlers/fast-paths.handler.ts injectLayoutShim()
-- (commit d2b3c26 on claude/diagnose-layout-regression-3d6sa) — the runtime shim
-- patches rendered HTML on the deterministic template path with !important rules.
-- This migration cleans the html_skeleton column at source so the shim can
-- eventually be removed and the rows match what they should have shipped.
--
-- Three recurring CSS bugs across 8 Apr 11–12 skeletons:
--   1. .tabs / .tabs-bar / .nav-tabs declared `display:flex` without
--      `overflow-x:auto`. Combined with `body{overflow-x:hidden}` this
--      silently crops tabs that exceed viewport width.
--   2. Sidebar `z-index:50` vs sticky topbar `z-index:40` — sidebar bleeds
--      through the backdrop-blurred topbar at the seam.
--   3. Flex children inside the tab bar collapse without `flex-shrink:0`.
--
-- Approach: surgical, idempotent regexp_replace. Only rows whose html_skeleton
-- still contains the buggy pattern are touched. Re-running this migration is
-- a no-op once the rows are clean. The runtime shim continues to enforce the
-- same rules with !important so any future regression is caught at write-time.
--
-- Affected rows (verified by grep over migration source):
--   crm-dashboard, marketing-dashboard, sales-forecast, win-loss-analysis,
--   pipeline-review, finance-dashboard, youth-sports-league-manager,
--   executive-command-dashboard

BEGIN;

-- ── Patch 1 — z-index inversion ──────────────────────────────────────────────
-- Only patch rows where BOTH .sidebar{...z-index:50} AND .topbar{...z-index:40}
-- co-occur, to avoid touching unrelated z-index:50 declarations elsewhere.

UPDATE skill_registry
SET html_skeleton = regexp_replace(
      html_skeleton,
      '(\.sidebar\s*\{[^}]*?)z-index:\s*50',
      '\1z-index:40',
      'g'
    ),
    updated_at = now()
WHERE html_skeleton IS NOT NULL
  AND html_skeleton ~ '\.sidebar\s*\{[^}]*z-index:\s*50'
  AND html_skeleton ~ '\.topbar\s*\{[^}]*z-index:\s*40';

UPDATE skill_registry
SET html_skeleton = regexp_replace(
      html_skeleton,
      '(\.topbar\s*\{[^}]*?)z-index:\s*40',
      '\1z-index:60',
      'g'
    ),
    updated_at = now()
WHERE html_skeleton IS NOT NULL
  AND html_skeleton ~ '\.topbar\s*\{[^}]*z-index:\s*40'
  AND html_skeleton ~ '\.sidebar\s*\{[^}]*z-index:\s*40';  -- after patch 1

-- ── Patch 2 — tab nav overflow handling ──────────────────────────────────────
-- For each tab-bar selector, append `overflow-x:auto;flex-wrap:nowrap` if the
-- declaration block doesn't already contain `overflow-x:auto`. We rewrite the
-- closing brace to insert before it. The check `NOT LIKE` keeps it idempotent.

UPDATE skill_registry
SET html_skeleton = regexp_replace(
      html_skeleton,
      '(\.tabs-bar\s*\{[^}]*?)\}',
      '\1;overflow-x:auto;flex-wrap:nowrap}',
      'g'
    ),
    updated_at = now()
WHERE html_skeleton IS NOT NULL
  AND html_skeleton ~ '\.tabs-bar\s*\{'
  AND html_skeleton !~ '\.tabs-bar\s*\{[^}]*overflow-x\s*:\s*auto';

UPDATE skill_registry
SET html_skeleton = regexp_replace(
      html_skeleton,
      '(\.tabs\s*\{[^}]*?)\}',
      '\1;overflow-x:auto;flex-wrap:nowrap}',
      'g'
    ),
    updated_at = now()
WHERE html_skeleton IS NOT NULL
  AND html_skeleton ~ '\.tabs\s*\{'
  AND html_skeleton !~ '\.tabs\s*\{[^}]*overflow-x\s*:\s*auto';

UPDATE skill_registry
SET html_skeleton = regexp_replace(
      html_skeleton,
      '(\.nav-tabs\s*\{[^}]*?)\}',
      '\1;overflow-x:auto;flex-wrap:nowrap}',
      'g'
    ),
    updated_at = now()
WHERE html_skeleton IS NOT NULL
  AND html_skeleton ~ '\.nav-tabs\s*\{'
  AND html_skeleton !~ '\.nav-tabs\s*\{[^}]*overflow-x\s*:\s*auto';

-- ── Patch 3 — flex-shrink:0 on tab bar children ──────────────────────────────
-- Append a generic rule per affected tab class. We can't surgically inject
-- into existing child rules without enumerating each variant (.tab-btn, .tab,
-- .nav-tab, etc.), so we append a safe extra rule outside the original block.
-- Idempotent via a sentinel marker.

UPDATE skill_registry
SET html_skeleton = regexp_replace(
      html_skeleton,
      '(</style>)',
      E'\n.tabs>*,.tabs-bar>*,.nav-tabs>*{flex-shrink:0}/*vibe-layout-shim-v1*/\n\\1',
      ''
    ),
    updated_at = now()
WHERE html_skeleton IS NOT NULL
  AND html_skeleton LIKE '%</style>%'
  AND html_skeleton NOT LIKE '%vibe-layout-shim-v1%'
  AND (html_skeleton ~ '\.tabs\s*\{' OR html_skeleton ~ '\.tabs-bar\s*\{' OR html_skeleton ~ '\.nav-tabs\s*\{');

-- ── Verification ─────────────────────────────────────────────────────────────
-- After running this migration, execute the standard skeleton verification
-- query from CLAUDE.md against each affected skill_name to confirm:
--   length > 20000, charts >= 4, has_try_catch, has_team_token, has_sample_data
--
-- SELECT skill_name,
--   length(html_skeleton) AS length,
--   (LENGTH(html_skeleton) - LENGTH(REPLACE(html_skeleton, 'new Chart(', '')))
--     / LENGTH('new Chart(') AS charts,
--   html_skeleton ~ '\.tabs[^}]*overflow-x\s*:\s*auto' AS tabs_overflow_ok,
--   html_skeleton ~ '\.sidebar[^}]*z-index:\s*40' AS sidebar_z_ok,
--   html_skeleton ~ '\.topbar[^}]*z-index:\s*60' AS topbar_z_ok,
--   html_skeleton LIKE '%vibe-layout-shim-v1%' AS shim_marker_ok
-- FROM skill_registry
-- WHERE html_skeleton IS NOT NULL
-- ORDER BY skill_name;

COMMIT;
