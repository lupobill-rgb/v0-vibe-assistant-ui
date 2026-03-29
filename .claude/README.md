# VIBE Claude Code Setup — Slash Commands + Subagents

## Install Slash Commands
Copy these 5 files into your VIBE repo:

```bash
cd /path/to/UbiGrowth/VIBE
mkdir -p .claude/commands
cp debug.md smoke.md status.md ship.md close.md .claude/commands/
```

Then in Claude Code:
- `/project:debug` — diagnose deployment issues across the stack
- `/project:smoke` — smoke test build and edit flows
- `/project:status` — infrastructure dashboard (one-liner per service)
- `/project:ship` — lint, test, commit, push to main
- `/project:close` — end-of-session summary (what decided / what next / who owns it)

## Install Subagents
Copy these 5 files into your VIBE repo:

```bash
mkdir -p .claude/agents
cp vibe-architect.md vibe-implementer.md vibe-qa.md vibe-marketplace.md vibe-devops.md .claude/agents/
```

Claude Code auto-delegates to these based on the task:

| Agent | Role | Model | Tools |
|-------|------|-------|-------|
| vibe-architect | Architecture decisions, PR review, technical planning | Opus | Read-only |
| vibe-implementer | Write code, fix bugs, produce diffs | Opus | Full access |
| vibe-qa | Test changes, catch regressions, validate deploys | Sonnet | Read + Bash |
| vibe-marketplace | OAuth connectors, skills, Nango, integrations | Sonnet | Full access |
| vibe-devops | Deployments, infra, Railway/Vercel/Supabase ops | Sonnet | Read + Bash |

## Pipeline Example
For a feature build, the flow is:
1. **vibe-architect** analyzes the codebase and recommends approach
2. **vibe-implementer** writes the code as unified diffs
3. **vibe-qa** validates the changes before shipping
4. **vibe-devops** monitors the deployment
5. `/project:close` produces the handoff doc

## Notes
- Agents run in their own context windows — they don't bloat your main session
- Claude auto-delegates based on task description, or you can invoke explicitly: "Use the vibe-qa agent to validate this change"
- Architect and QA are read-only by design — they can't accidentally break anything
- Implementer uses Opus for code quality; QA/Marketplace/DevOps use Sonnet for speed
