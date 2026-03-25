#!/usr/bin/env npx tsx
/**
 * hydrate-skills.ts
 *
 * Reads each SKILL.md from vendor/knowledge-work-plugins/{plugin}/skills/{skill}/SKILL.md
 * and upserts the content into the skill_registry table in Supabase.
 *
 * Usage:
 *   npx tsx scripts/hydrate-skills.ts
 *
 * Requires env vars:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { readdirSync, readFileSync, existsSync, statSync } from 'fs';
import { join, resolve } from 'path';

const VENDOR_ROOT = resolve(__dirname, '..', 'vendor', 'knowledge-work-plugins');

interface SkillEntry {
  pluginName: string;
  skillName: string;
  content: string;
}

function discoverSkills(): SkillEntry[] {
  if (!existsSync(VENDOR_ROOT)) {
    console.warn(`⚠  Vendor directory not found: ${VENDOR_ROOT}`);
    return [];
  }

  const entries: SkillEntry[] = [];

  const plugins = readdirSync(VENDOR_ROOT).filter((d) =>
    statSync(join(VENDOR_ROOT, d)).isDirectory()
  );

  for (const pluginName of plugins) {
    const skillsDir = join(VENDOR_ROOT, pluginName, 'skills');
    if (!existsSync(skillsDir) || !statSync(skillsDir).isDirectory()) continue;

    const skills = readdirSync(skillsDir).filter((d) =>
      statSync(join(skillsDir, d)).isDirectory()
    );

    for (const skillName of skills) {
      const mdPath = join(skillsDir, skillName, 'SKILL.md');
      if (!existsSync(mdPath)) continue;

      const content = readFileSync(mdPath, 'utf-8');
      entries.push({ pluginName, skillName, content });
    }
  }

  return entries;
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const skills = discoverSkills();

  if (skills.length === 0) {
    console.log('No SKILL.md files found. Nothing to hydrate.');
    return;
  }

  console.log(`Found ${skills.length} skill(s) to hydrate:\n`);

  let updated = 0;
  let failed = 0;

  for (const { pluginName, skillName, content } of skills) {
    const label = `${pluginName}/${skillName}`;
    const { error } = await supabase
      .from('skill_registry')
      .update({ content })
      .eq('plugin_name', pluginName)
      .eq('skill_name', skillName);

    if (error) {
      console.error(`  FAIL  ${label}: ${error.message}`);
      failed++;
    } else {
      console.log(`  OK    ${label} (${content.length} chars)`);
      updated++;
    }
  }

  console.log(`\nDone. Updated: ${updated}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
