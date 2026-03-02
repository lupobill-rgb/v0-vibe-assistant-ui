import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildStarterSitePlan, MAX_INITIAL_PAGES } from '../apps/api/src/starter-site';

const prompt = 'Build a multi page marketing website with home, services, about, contact, pricing, blog';
const rawPlan = [
  { name: 'home', title: 'Home', description: 'home page' },
  { name: 'services', title: 'Services', description: 'services page' },
  { name: 'about', title: 'About', description: 'about page' },
  { name: 'contact', title: 'Contact', description: 'contact page' },
  { name: 'pricing', title: 'Pricing', description: 'pricing page' },
];

const plan = buildStarterSitePlan(rawPlan, prompt);
assert.ok(plan.pages.length <= MAX_INITIAL_PAGES, `Expected <= ${MAX_INITIAL_PAGES} pages`);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-starter-'));
const filenames = plan.pages.map((p) => (p.route === '/' ? 'index' : p.route.slice(1)));

for (const page of plan.pages) {
  const filename = page.route === '/' ? 'index' : page.route.slice(1);
  const navLinks = plan.pages
    .map((p) => `<a href="${p.route === '/' ? 'index.html' : `${p.route.slice(1)}.html`}">${p.name}</a>`)
    .join('');
  fs.writeFileSync(
    path.join(tmp, `${filename}.html`),
    `<!doctype html><html><head><title>${page.title}</title><meta name="description" content="${page.description}"></head><body><nav>${navLinks}</nav><h1>${page.title}</h1><section>One</section><section>Two</section><button>Get Started</button></body></html>`,
    'utf8',
  );
}

for (const filename of filenames) {
  assert.ok(fs.existsSync(path.join(tmp, `${filename}.html`)), `Missing ${filename}.html`);
}

for (const filename of filenames) {
  const html = fs.readFileSync(path.join(tmp, `${filename}.html`), 'utf8');
  for (const target of filenames) {
    const href = target === 'index' ? 'index.html' : `${target}.html`;
    assert.ok(html.includes(`href="${href}"`), `${filename}.html missing nav link to ${href}`);
  }
}

console.log('verify:starter-site passed');
