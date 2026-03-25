#!/usr/bin/env npx tsx
/**
 * seed-skills.ts — Read SKILL.md files from vendor/knowledge-work-plugins
 * and UPDATE existing skill_registry rows with the full content.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";

const SUPABASE_URL = "https://ptaqytvztkhjpuawdxng.supabase.co";
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
if (!SUPABASE_KEY) {
  console.error("SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY not set");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const PLUGINS = [
  "human-resources",
  "finance",
  "legal",
  "sales",
  "marketing",
  "engineering",
  "operations",
  "product-management",
  "customer-support",
  "design",
  "data",
] as const;

const TEAM_FUNCTION_MAP: Record<string, string> = {
  "human-resources": "hr",
  "product-management": "product",
  "customer-support": "support",
};

function teamFunction(plugin: string): string {
  return TEAM_FUNCTION_MAP[plugin] ?? plugin;
}

const VENDOR_ROOT = join(__dirname, "..", "vendor", "knowledge-work-plugins");

interface SkillEntry {
  plugin: string;
  skill: string;
  content: string;
  teamFunction: string;
}

function discoverSkills(): SkillEntry[] {
  const entries: SkillEntry[] = [];
  for (const plugin of PLUGINS) {
    const skillsDir = join(VENDOR_ROOT, plugin, "skills");
    if (!existsSync(skillsDir)) {
      console.warn(`No skills dir: ${plugin}`);
      continue;
    }
    for (const skill of readdirSync(skillsDir, { withFileTypes: true })) {
      if (!skill.isDirectory()) continue;
      const mdPath = join(skillsDir, skill.name, "SKILL.md");
      if (!existsSync(mdPath)) continue;
      entries.push({
        plugin,
        skill: skill.name,
        content: readFileSync(mdPath, "utf-8"),
        teamFunction: teamFunction(plugin),
      });
    }
  }
  return entries;
}

async function main() {
  const skills = discoverSkills();
  console.log(`Discovered ${skills.length} skills across ${PLUGINS.length} plugins\n`);

  let updated = 0;
  let skipped = 0;

  for (const s of skills) {
    const { error, count } = await supabase
      .from("skill_registry")
      .update({ content: s.content })
      .eq("plugin_name", s.plugin)
      .eq("skill_name", s.skill);

    if (error) {
      console.error(`ERROR ${s.plugin}/${s.skill}: ${error.message}`);
      skipped++;
      continue;
    }
    const bytes = Buffer.byteLength(s.content, "utf-8");
    console.log(`Updated ${s.plugin}/${s.skill} (${bytes} bytes)`);
    updated++;
  }

  console.log(`\n--- Done: ${updated} updated, ${skipped} errors ---\n`);

  // Summary query
  const { data, error } = await supabase.rpc("sql", {
    query: `
      SELECT team_function, count(*)::int as count, sum(length(content))::int as total_bytes
      FROM skill_registry
      WHERE content != 'PENDING_DESKTOP_SEED'
      GROUP BY team_function
      ORDER BY team_function
    `,
  });

  if (error) {
    // Fallback: query the table directly
    const { data: rows, error: e2 } = await supabase
      .from("skill_registry")
      .select("team_function, content")
      .neq("content", "PENDING_DESKTOP_SEED");

    if (e2) {
      console.error("Summary query failed:", e2.message);
      return;
    }
    const agg = new Map<string, { count: number; bytes: number }>();
    for (const r of rows ?? []) {
      const tf = r.team_function ?? "unknown";
      const prev = agg.get(tf) ?? { count: 0, bytes: 0 };
      prev.count++;
      prev.bytes += (r.content as string)?.length ?? 0;
      agg.set(tf, prev);
    }
    console.log("team_function          | count | total_bytes");
    console.log("-----------------------|-------|------------");
    for (const [tf, v] of [...agg.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      console.log(`${tf.padEnd(23)}| ${String(v.count).padStart(5)} | ${String(v.bytes).padStart(10)}`);
    }
  } else {
    console.log("team_function          | count | total_bytes");
    console.log("-----------------------|-------|------------");
    for (const row of data ?? []) {
      const tf = (row.team_function ?? "unknown") as string;
      console.log(`${tf.padEnd(23)}| ${String(row.count).padStart(5)} | ${String(row.total_bytes).padStart(10)}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
