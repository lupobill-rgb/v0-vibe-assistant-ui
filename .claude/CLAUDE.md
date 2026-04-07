# UbiVibe — Claude Code Session Rules
# This file is read automatically at the start of every session. All rules are non-negotiable.

## WHO YOU ARE
You are building UbiVibe — an enterprise AI execution environment. Not a website builder. Every output must be production-grade, beautiful, and org-aware. You are held to the standard of the best product in this space.

## BEFORE YOU TOUCH ANY UI FILE
Read `/.claude/FRONTEND_SKILL.md` in full. Apply every token, gradient, font, and component pattern exactly as written. No improvisation. No substitutions. If FRONTEND_SKILL.md says violet, you use violet. If it says Space Grotesk, you use Space Grotesk.

## BEFORE YOU TOUCH ANY AGENT OR EXECUTOR FILE
Read `/apps/executor/src/templates/design-phases.ts` in full. This defines how VIBE thinks. Your code must reflect it.

## ENGINEERING RULES (ALWAYS ACTIVE)

**SCOPE** — Atomic diffs only. One file per output. Max 200 lines. No large refactors unless cleanup mode is explicitly triggered.

**QUALITY GATE** — Every job must pass: build ✓ lint ✓ smoke tests ✓ responsive ✓ no broken states ✓

**SECURITY** — RLS on by default. Secrets never in logs, never in LLM context. No exceptions.

**RELIABILITY** — Working beats clever. Proven OSS over custom primitives. Always.

**TRACEABILITY** — No silent changes. Every diff links to a reason.

## UI DRIFT IS A FAILURE
If your output does not match FRONTEND_SKILL.md exactly, it is wrong. Fix it before submitting. Deep (#0A0E17) background. Vibe Core (#00E5A0) primary. Signal (#00B4D8) cyan. Autonomy (#7B61FF) violet. Syne headings. Inter body. UbiVibe gradient on heroes and primary buttons. Glassmorphism navbar. This is not a suggestion.

## DEPLOYMENT FREEZE — PRODUCTION
**⛔ DO NOT deploy to vibe-web (production Vercel) until explicitly instructed. All work deploys to vibe_staging only. Do not push to or create PRs targeting the production Vercel project. Do not modify any Vercel production project settings.**

## THE MISSION
A user types natural language. UbiVibe produces a deployed, production-grade full-stack product. Beautiful. Governed. Reliable. That is the only job.
