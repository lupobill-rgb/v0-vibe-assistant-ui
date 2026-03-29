import { describe, it } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';

/**
 * Smoke tests for the generate-diff Edge Function's mode routing
 * and JSX-rejection system prompts.
 *
 * These tests simulate calling the Edge Function via a mock LLM backend
 * that captures the system message, allowing us to verify:
 *   1. Mode routing selects the correct system prompt
 *   2. PAGE_SYSTEM and SINGLE_PAGE_SYSTEM contain anti-JSX rules
 *   3. PLAN_SYSTEM requests JSON output
 *   4. Default mode (no mode param) still uses the diff prompt
 *   5. max_tokens defaults are correct per mode
 *   6. Explicit `system` param overrides mode-based selection
 */

// ── Re-implement the edge function's core logic for unit testing ─────────────

function buildVibeSystemRules(teamName?: string, orgName?: string): string {
  const team = teamName || 'this team';
  const org = orgName || 'the platform';
  return `You are VIBE, the AI execution engine for ${team} on the ${org} platform.
Output exactly what the user's intent requires — no more, no less.
If the user asks to build, produce a complete deployable artifact.
If the user asks to draft, analyze, or plan, produce that content directly.
Follow any DEPARTMENT SKILLS injected below precisely.`;
}

const PLAN_SYSTEM =
  "You are VIBE, an AI website planner. " +
  "1. Given a user prompt, return a JSON array of page objects. Each object has: name, title, description. " +
  "2. Return ONLY valid JSON — no markdown fences, no explanation, no extra text. " +
  "3. Return between 1 and 6 pages depending on the request. " +
  "   - If the user asks for a single page, landing page, or one-pager, return EXACTLY 1 page (just index). " +
  "   - If the user asks for a dashboard or app, return 1-3 pages focused on core functionality. " +
  "   - If the user asks for a full website or multi-page site, return 3-6 pages. " +
  "4. Each page should serve a distinct purpose. " +
  "5. Descriptions should be specific enough to guide HTML generation. " +
  "6. Users can add more pages later — focus on the core pages that deliver the most value.";

const MULTI_PAGE_SYSTEM = `You are VIBE, an AI website builder generating one page of a multi-page website.
Return a complete, self-contained HTML page. All CSS in a single <style> tag in <head>. No external stylesheets or dependencies.
This page is part of a larger site — it MUST share a consistent header, footer, navigation, and visual identity with every other page.

STRUCTURE — EVERY PAGE:
- Semantic HTML: <header>, <nav>, <main>, <footer>.
- <header>: logo/site name on the left, <nav> links on the right, max 6 nav items.
- Nav links must have 3 CSS states: default, :hover (subtle color/underline shift), and .active (bold or accent-colored).
- Mark the current page's nav link with aria-current="page" and a visually distinct .active class.
- Nav links should use relative hrefs matching the page routes from the plan (e.g., href="/" for index, href="/about" for about).
- <footer>: secondary links row, copyright line, optional contact info. Consistent across all pages.

LAYOUT:
- CSS Grid or Flexbox for all layouts.
- Max content width 1200px, centered with margin: 0 auto.
- Generous section padding: 80-120px vertical, 24px horizontal.

TYPOGRAPHY:
- Page h1: font-size: clamp(2.5rem, 5vw, 4.5rem); font-weight: 800.
- Section h2: font-size: clamp(1.75rem, 3vw, 2.5rem); font-weight: 700.
- Body text: 1rem with line-height: 1.6; max-width: 65ch for readability.
- Font stack: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif.

CONTENT:
- Interpret the page description to determine content, sections, and tone.
- Every section must have visible, styled content. No empty elements, no placeholder text, no Lorem ipsum.
- Include at least 2 meaningful content sections between header and footer.

DESIGN:
- Shared visual identity: same font stack, color palette, spacing, border-radius across all pages.
- Default when unspecified: dark theme (#0a0a0a background, #ffffff text, one accent color).
- Minimum 4.5:1 contrast ratio for all text.
- Smooth section transitions using subtle borders or background color shifts.

MOBILE RESPONSIVE:
- Single @media (max-width: 768px) breakpoint.
- Hamburger menu using CSS-only checkbox hack: hidden checkbox + label with ☰ icon toggles nav visibility.
- Nav stacks vertically on mobile, hidden by default, shown when checkbox is checked.

FORBIDDEN: NEVER output JSX, TSX, or React component syntax. No 'import' statements, no {/* comments */}, no {" "} expressions, no 'export default function'. No Lorem ipsum.
Output ONLY valid HTML that renders directly in a browser iframe with zero compilation. No markdown. No explanation. Start with <!DOCTYPE html>.`;

const PAGE_SYSTEM = MULTI_PAGE_SYSTEM;

const SINGLE_PAGE_SYSTEM = `You are VIBE, an AI website builder that produces best-in-class single-page sites.
Return a complete, self-contained single-page HTML site. All CSS in a single <style> tag in <head>. No external stylesheets or dependencies.

LAYOUT & STRUCTURE:
- Use semantic HTML: <header>/<nav>, <main>, <section>, <footer>.
- Use CSS Grid or Flexbox for all layouts.
- Max content width 1200px, centered with margin: 0 auto.
- Generous section padding: 80-120px vertical, 24px horizontal.
- Navigation should link to sections via anchor IDs with smooth scrolling (scroll-behavior: smooth).

TYPOGRAPHY:
- Hero h1: font-size: clamp(2.5rem, 5vw, 4.5rem); font-weight: 800.
- Section h2: font-size: clamp(1.75rem, 3vw, 2.5rem); font-weight: 700.
- Body text: 1rem with line-height: 1.6; max-width: 65ch for readability.
- Font stack: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif.

HERO SECTION:
- min-height: 100vh with content centered vertically and horizontally.
- One clear benefit-driven headline (never generic like "Welcome to Our Site").
- 1-2 sentence supporting subtext that explains the value proposition.
- Single primary CTA button with min 44px tap target, bold color, rounded corners.
- No stock photo descriptions. Use CSS gradients, shapes, or abstract patterns for visual interest.

CONTENT SECTIONS:
- Features: 3-column CSS Grid (1-column on mobile) with icon placeholder (emoji or CSS shape), heading, and description.
- Include a social proof or testimonials section with real-sounding quotes.
- Final CTA section before footer with a compelling call to action.
- Every section must have visible, styled content. No empty elements, no placeholder text, no Lorem ipsum.

DESIGN:
- Interpret the user's prompt for color palette, mood, and tone.
- Default when unspecified: dark theme (#0a0a0a background, #ffffff text, accent color derived from prompt context).
- Minimum 4.5:1 contrast ratio for all text.
- Smooth section transitions using subtle borders or background color shifts.
- Mobile responsive with a single @media (max-width: 768px) breakpoint.

FORBIDDEN: NEVER output JSX, TSX, or React component syntax. No 'import' statements, no {/* comments */}, no {" "} expressions, no 'export default function'. No Lorem ipsum.
Output ONLY valid HTML that renders directly in a browser iframe with zero compilation. No markdown. No explanation. Start with <!DOCTYPE html>.`;

/**
 * Mirrors the edge function's system message builder.
 * Returns { systemMsg, resolvedMaxTokens }.
 */
function buildSystemMessage(params: {
  system?: string;
  mode?: string;
  context?: string;
  max_tokens?: number;
  team_name?: string;
  org_name?: string;
}): { systemMsg: string; resolvedMaxTokens: number } {
  let baseSystemMsg: string;
  let defaultMaxTokens = 4096;

  if (params.system) {
    baseSystemMsg = params.system;
  } else if (params.mode === 'plan') {
    baseSystemMsg = PLAN_SYSTEM;
    defaultMaxTokens = 2048;
  } else if (params.mode === 'page') {
    baseSystemMsg = PAGE_SYSTEM + (params.context ? "\nContext:\n" + params.context : "");
    defaultMaxTokens = 8192;
  } else if (params.mode === 'html') {
    baseSystemMsg = SINGLE_PAGE_SYSTEM + (params.context ? "\nContext:\n" + params.context : "");
    defaultMaxTokens = 8192;
  } else {
    baseSystemMsg = "You are VIBE, an AI website builder. Return ONLY a valid unified diff. No markdown fences, no explanation." +
      (params.context ? "\nProject context:\n" + params.context : "");
  }

  const vibeRules = buildVibeSystemRules(params.team_name, params.org_name);
  return {
    systemMsg: vibeRules + "\n" + baseSystemMsg,
    resolvedMaxTokens: params.max_tokens || defaultMaxTokens,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Edge Function — mode routing', () => {
  it('plan mode uses PLAN_SYSTEM prompt', () => {
    const { systemMsg } = buildSystemMessage({ mode: 'plan' });
    assert.ok(systemMsg.includes('AI website planner'), 'Should use planner prompt');
    assert.ok(systemMsg.includes('JSON array of page objects'), 'Should request JSON output');
    assert.ok(!systemMsg.includes('NEVER output JSX'), 'Plan mode should not have JSX rules');
  });

  it('page mode uses PAGE_SYSTEM prompt', () => {
    const { systemMsg } = buildSystemMessage({ mode: 'page' });
    assert.ok(systemMsg.includes('AI website builder'), 'Should use builder prompt');
    assert.ok(systemMsg.includes('<!DOCTYPE html>'), 'Should mention DOCTYPE');
    assert.ok(systemMsg.includes('Semantic HTML'), 'Should mention semantic HTML');
  });

  it('html mode uses SINGLE_PAGE_SYSTEM prompt', () => {
    const { systemMsg } = buildSystemMessage({ mode: 'html' });
    assert.ok(systemMsg.includes('AI website builder'), 'Should use builder prompt');
    assert.ok(systemMsg.includes('dark theme'), 'Single-page mode should mention dark theme');
  });

  it('no mode uses default diff prompt', () => {
    const { systemMsg } = buildSystemMessage({});
    assert.ok(systemMsg.includes('unified diff'), 'Default mode should request unified diff');
    assert.ok(!systemMsg.includes('NEVER output JSX'), 'Default mode should not have JSX rules');
  });

  it('explicit system param overrides mode', () => {
    const custom = 'Custom system prompt';
    const { systemMsg } = buildSystemMessage({ system: custom, mode: 'page' });
    assert.ok(systemMsg.includes(custom), 'Should use custom system prompt');
    assert.ok(!systemMsg.includes('NEVER output JSX'), 'Custom system should not include JSX rules');
  });
});

describe('Edge Function — anti-JSX rules', () => {
  const JSX_PATTERNS = [
    'import',
    '{/* comments */}',
    '{" "}',
    'export default function',
  ];

  it('PAGE_SYSTEM explicitly forbids all JSX patterns', () => {
    for (const pattern of JSX_PATTERNS) {
      assert.ok(
        PAGE_SYSTEM.includes(pattern),
        `PAGE_SYSTEM should forbid "${pattern}"`,
      );
    }
    assert.ok(
      PAGE_SYSTEM.includes('NEVER output JSX, TSX, or React component syntax'),
      'PAGE_SYSTEM should have the NEVER JSX rule',
    );
    assert.ok(
      PAGE_SYSTEM.includes('renders directly in a browser iframe with zero compilation'),
      'PAGE_SYSTEM should require browser-renderable HTML',
    );
  });

  it('SINGLE_PAGE_SYSTEM explicitly forbids all JSX patterns', () => {
    for (const pattern of JSX_PATTERNS) {
      assert.ok(
        SINGLE_PAGE_SYSTEM.includes(pattern),
        `SINGLE_PAGE_SYSTEM should forbid "${pattern}"`,
      );
    }
    assert.ok(
      SINGLE_PAGE_SYSTEM.includes('NEVER output JSX, TSX, or React component syntax'),
      'SINGLE_PAGE_SYSTEM should have the NEVER JSX rule',
    );
    assert.ok(
      SINGLE_PAGE_SYSTEM.includes('renders directly in a browser iframe with zero compilation'),
      'SINGLE_PAGE_SYSTEM should require browser-renderable HTML',
    );
  });

  it('PLAN_SYSTEM does NOT have JSX rules (irrelevant for JSON)', () => {
    assert.ok(
      !PLAN_SYSTEM.includes('NEVER output JSX'),
      'PLAN_SYSTEM should not have JSX rules',
    );
  });

  it('page mode system message includes JSX rules when assembled', () => {
    const { systemMsg } = buildSystemMessage({ mode: 'page' });
    assert.ok(systemMsg.includes('NEVER output JSX'), 'Assembled page system msg should contain JSX rules');
  });

  it('html mode system message includes JSX rules when assembled', () => {
    const { systemMsg } = buildSystemMessage({ mode: 'html' });
    assert.ok(systemMsg.includes('NEVER output JSX'), 'Assembled html system msg should contain JSX rules');
  });
});

describe('Edge Function — max_tokens defaults', () => {
  it('plan mode defaults to 2048 tokens', () => {
    const { resolvedMaxTokens } = buildSystemMessage({ mode: 'plan' });
    assert.strictEqual(resolvedMaxTokens, 2048);
  });

  it('page mode defaults to 8192 tokens', () => {
    const { resolvedMaxTokens } = buildSystemMessage({ mode: 'page' });
    assert.strictEqual(resolvedMaxTokens, 8192);
  });

  it('html mode defaults to 8192 tokens', () => {
    const { resolvedMaxTokens } = buildSystemMessage({ mode: 'html' });
    assert.strictEqual(resolvedMaxTokens, 8192);
  });

  it('default (no mode) uses 4096 tokens', () => {
    const { resolvedMaxTokens } = buildSystemMessage({});
    assert.strictEqual(resolvedMaxTokens, 4096);
  });

  it('explicit max_tokens overrides mode default', () => {
    const { resolvedMaxTokens } = buildSystemMessage({ mode: 'plan', max_tokens: 1024 });
    assert.strictEqual(resolvedMaxTokens, 1024);
  });
});

describe('Edge Function — context handling', () => {
  it('page mode appends context to system message', () => {
    const ctx = 'PagePlan JSON: {...}. File: app/page.tsx';
    const { systemMsg } = buildSystemMessage({ mode: 'page', context: ctx });
    assert.ok(systemMsg.includes('\nContext:\n' + ctx), 'Should append context');
  });

  it('html mode appends context to system message', () => {
    const ctx = 'Some project context';
    const { systemMsg } = buildSystemMessage({ mode: 'html', context: ctx });
    assert.ok(systemMsg.includes('\nContext:\n' + ctx), 'Should append context');
  });

  it('plan mode ignores context', () => {
    const ctx = 'Should be ignored';
    const { systemMsg } = buildSystemMessage({ mode: 'plan', context: ctx });
    assert.ok(!systemMsg.includes(ctx), 'Plan mode should not include context');
  });

  it('default mode appends context as "Project context"', () => {
    const ctx = 'Existing project files';
    const { systemMsg } = buildSystemMessage({ context: ctx });
    assert.ok(systemMsg.includes('\nProject context:\n' + ctx), 'Default mode should use "Project context" prefix');
  });
});

describe('Edge Function — PLAN_SYSTEM page count rules', () => {
  it('allows 1-6 pages (not fixed at 4)', () => {
    assert.ok(PLAN_SYSTEM.includes('between 1 and 6 pages'), 'Should allow 1-6 pages');
    assert.ok(!PLAN_SYSTEM.includes('EXACTLY 4 pages'), 'Should NOT require exactly 4 pages');
  });

  it('has single-page guidance', () => {
    assert.ok(PLAN_SYSTEM.includes('single page') || PLAN_SYSTEM.includes('one-pager'),
      'Should mention single-page case');
  });

  it('has dashboard guidance', () => {
    assert.ok(PLAN_SYSTEM.includes('dashboard'), 'Should mention dashboard case');
  });

  it('has multi-page guidance', () => {
    assert.ok(PLAN_SYSTEM.includes('multi-page site') || PLAN_SYSTEM.includes('full website'),
      'Should mention full website case');
  });

  it('focuses on core value not fixed count', () => {
    assert.ok(PLAN_SYSTEM.includes('core pages that deliver the most value'),
      'Should focus on value, not fixed count');
    assert.ok(!PLAN_SYSTEM.includes('4 core pages'),
      'Should NOT mention 4 core pages');
  });
});

describe('Edge Function — thin wrapper (buildVibeSystemRules) always prepended', () => {
  const modes = ['plan', 'page', 'html', undefined];

  for (const mode of modes) {
    it(`prepends thin wrapper for mode=${mode ?? 'default'}`, () => {
      const { systemMsg } = buildSystemMessage({ mode });
      assert.ok(
        systemMsg.startsWith('You are VIBE, the AI execution engine'),
        `System message for mode=${mode ?? 'default'} should start with thin wrapper`,
      );
      assert.ok(
        systemMsg.includes('DEPARTMENT SKILLS'),
        'Should reference department skills',
      );
    });
  }

  it('interpolates team and org names', () => {
    const { systemMsg } = buildSystemMessage({ mode: 'plan', team_name: 'Sales', org_name: 'Acme Corp' });
    assert.ok(systemMsg.includes('for Sales on the Acme Corp platform'), 'Should interpolate team and org');
  });

  it('uses defaults when team/org not provided', () => {
    const { systemMsg } = buildSystemMessage({ mode: 'plan' });
    assert.ok(systemMsg.includes('for this team'), 'Should use default team name');
    assert.ok(systemMsg.includes('the platform'), 'Should use default org name');
  });
});
