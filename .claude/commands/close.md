# /close — Session Close-Out

Summarize the session: what was decided, what was done, what's next.

## Instructions

Generate a structured close-out report for this session.

### 1. Decisions Made

Review the conversation and list every decision that was made:
- Architecture choices
- Implementation approaches chosen (and alternatives rejected)
- Scope changes or deferrals
- Bug root causes identified

### 2. Changes Made

List every file that was modified or created:
```bash
git diff --name-only $(git merge-base HEAD origin/main)..HEAD
```

For each changed file, one-line summary of what changed and why.

### 3. Current State

- Branch: `git branch --show-current`
- Last commit: `git log --oneline -1`
- Pushed to remote: yes/no
- Build status: check if last build passed
- Sprint position: read from CLAUDE.md

### 4. What's Next

Based on the session context and CLAUDE.md sprint sequence:
- Immediate next task
- Any blockers or dependencies
- Suggested first command for next session

### 5. Ownership

For each open item, note who owns it:
- **Claude Code**: automated tasks, code changes
- **Human**: decisions, approvals, infrastructure access, secret rotation
- **Blocked**: waiting on external dependency

### Output Format

```
═══════════════════════════════════════
  SESSION CLOSE-OUT
  <date> | Branch: <branch>
═══════════════════════════════════════

DECISIONS
  • <decision 1>
  • <decision 2>

CHANGES (<n> files)
  • <file> — <what changed>

STATE
  Branch:   <branch>
  Commit:   <sha>
  Pushed:   yes/no
  Sprint:   <position>

NEXT
  → <immediate next task>
  ⚠ <blockers if any>

OWNERSHIP
  Claude:   <tasks>
  Human:    <tasks>
  Blocked:  <tasks>

═══════════════════════════════════════
```
