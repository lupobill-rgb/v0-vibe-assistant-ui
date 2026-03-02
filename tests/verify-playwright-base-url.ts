import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const configPath = path.join(root, 'playwright.config.ts');
const config = fs.readFileSync(configPath, 'utf8');
assert.ok(config.includes("baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'"), 'playwright.config.ts must use PLAYWRIGHT_BASE_URL fallback');

const specPath = path.join(root, 'tests/playwright/deployed-base-url.spec.ts');
const spec = fs.readFileSync(specPath, 'utf8');
assert.ok(spec.includes("page.goto('/')"), 'Playwright test should use relative goto');
assert.ok(!spec.includes('localhost:3000'), 'Playwright test must not hardcode localhost:3000');

console.log('verify:playwright-base-url passed');
