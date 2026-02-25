/**
 * Test script: create org → create team → create project → submit job
 *
 * Usage:
 *   npx tsx scripts/test-supabase-crud.ts
 *
 * Requires:
 *   - API server running on API_PORT (default 3001)
 *   - Supabase configured with the migration applied
 */

const API_URL = process.env.API_URL || 'http://localhost:3001';

async function request(method: string, path: string, body?: unknown) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    console.error(`  FAIL ${method} ${path} → ${res.status}`, data);
    throw new Error(`${method} ${path} failed: ${res.status}`);
  }
  return data;
}

async function main() {
  console.log('=== Supabase CRUD Integration Test ===\n');
  console.log(`API: ${API_URL}\n`);

  // 1. Create Organization
  console.log('1. Creating organization...');
  const org = await request('POST', '/orgs', {
    name: 'Test Organization',
    slug: `test-org-${Date.now()}`,
  });
  console.log(`   OK: org.id = ${org.id}, slug = ${org.slug}\n`);

  // 2. Create Team
  console.log('2. Creating team...');
  const team = await request('POST', `/orgs/${org.id}/teams`, {
    name: 'Engineering',
    slug: 'engineering',
  });
  console.log(`   OK: team.id = ${team.id}, org_id = ${team.org_id}\n`);

  // 3. List teams
  console.log('3. Listing teams for org...');
  const teams = await request('GET', `/orgs/${org.id}/teams`);
  console.log(`   OK: ${teams.length} team(s) found\n`);

  // 4. Create Project
  console.log('4. Creating project...');
  const project = await request('POST', '/projects', {
    name: `test-project-${Date.now()}`,
    team_id: team.id,
  });
  console.log(`   OK: project.id = ${project.id}, team_id = ${project.team_id}\n`);

  // 5. List projects
  console.log('5. Listing projects for team...');
  const projects = await request('GET', `/projects?team_id=${team.id}`);
  console.log(`   OK: ${projects.length} project(s) found\n`);

  // 6. Submit Job
  console.log('6. Submitting job...');
  const job = await request('POST', '/jobs', {
    prompt: 'Add a hello world page',
    project_id: project.id,
  });
  console.log(`   OK: task_id = ${job.task_id}, status = ${job.status}\n`);

  // 7. Get job details
  console.log('7. Getting job details...');
  const jobDetails = await request('GET', `/jobs/${job.task_id}`);
  console.log(`   OK: state = ${jobDetails.execution_state}, project_id = ${jobDetails.project_id}\n`);

  // 8. List project jobs
  console.log('8. Listing jobs for project...');
  const projectJobs = await request('GET', `/projects/${project.id}/jobs`);
  console.log(`   OK: ${projectJobs.length} job(s) found\n`);

  console.log('=== All tests passed ===');
  console.log('\nCreated resources:');
  console.log(`  Organization: ${org.id} (${org.slug})`);
  console.log(`  Team:         ${team.id} (${team.name})`);
  console.log(`  Project:      ${project.id} (${project.name})`);
  console.log(`  Job:          ${job.task_id}`);
}

main().catch((err) => {
  console.error('\nTest failed:', err.message);
  process.exit(1);
});
