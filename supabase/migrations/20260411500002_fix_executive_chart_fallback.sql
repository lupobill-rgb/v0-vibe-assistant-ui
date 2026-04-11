-- Fix: Wrap every vibeLoadData() call site in try/catch so chart IIFEs
-- fall back to sample data even when vibeLoadData throws (RLS/auth).
-- Previously an unhandled throw bypassed the if(!rows.length) fallback.
--
-- Pattern matched (7 occurrences across skeleton):
--   var <var>=await vibeLoadData(...);
--   if(!<var>.length) <var>=window.__VIBE_SAMPLE__.<key>;
--
-- Replaced with:
--   var <var>=[];try{<var>=await vibeLoadData(...)}catch(e){}
--   if(!<var>.length) <var>=(window.__VIBE_SAMPLE__||{}).<key>||[];

UPDATE skill_registry
SET html_skeleton = regexp_replace(
  html_skeleton,
  E'var (\\w+)=await vibeLoadData\\(([^)]+)\\);\\s*if\\(!\\1\\.length\\) \\1=window\\.__VIBE_SAMPLE__\\.(\\w+);',
  E'var \\1=[];try{\\1=await vibeLoadData(\\2)}catch(e){}\nif(!\\1.length) \\1=(window.__VIBE_SAMPLE__||{}).\\3||[];',
  'g'
)
WHERE skill_name IN ('executive-dashboard', 'executive-command-dashboard');

NOTIFY pgrst, 'reload schema';
