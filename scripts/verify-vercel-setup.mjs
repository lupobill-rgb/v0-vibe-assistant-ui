#!/usr/bin/env node
import fs from 'node:fs';

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

const rootPkg = readJson('package.json');
const webPkg = readJson('apps/web/package.json');
const rootVercelConfig = readJson('vercel.json');
const webVercelConfig = readJson('apps/web/vercel.json');

assert(Boolean(webPkg.dependencies?.next || webPkg.devDependencies?.next), 'apps/web declares Next.js dependency');

assert(rootVercelConfig.framework === 'nextjs', 'root vercel.json sets framework to nextjs');
assert(rootVercelConfig.installCommand === 'npm install', 'root vercel.json installCommand is npm install');
assert(rootVercelConfig.buildCommand === 'npm run build', 'root vercel.json buildCommand is npm run build');

assert(webVercelConfig.framework === 'nextjs', 'apps/web vercel.json sets framework to nextjs');
assert(webVercelConfig.installCommand === 'npm install', 'apps/web vercel.json installCommand is npm install');
assert(webVercelConfig.buildCommand === 'npm run build', 'apps/web vercel.json buildCommand is npm run build');

assert(rootPkg.scripts?.['build:web'] === 'npm run build --workspace=apps/web', 'root package.json has build:web workspace script');

console.log('\nAll Vercel monorepo checks passed.');
