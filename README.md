# VIBE

**V**ibe-coding **I**nteractive **B**ranch **E**volver

A Lovable-style "vibe coding" web application that takes natural language prompts, generates code diffs, runs CI-parity preflight checks, and automatically opens GitHub pull requests.

![VIBE Architecture](https://img.shields.io/badge/architecture-monorepo-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Architecture

VIBE is a monorepo with three main applications:

- **apps/web**: React + Vite frontend with live log streaming
- **apps/api**: Express backend with SSE support for real-time updates
- **apps/executor**: Worker process that executes the deterministic coding loop

### How It Works

1. User submits a prompt via the web UI
2. API creates a task and queues it in SQLite
3. Executor picks up the task and begins iteration loop:
   - Clones repository and checks out base branch
   - Builds deterministic context (ripgrep + 1-hop imports)
   - Calls LLM to generate unified diff
   - Validates and applies diff
   - Runs Docker preflight checks (lint → typecheck → test → smoke)
   - If checks pass: pushes branch and creates GitHub PR
   - If checks fail: retries (max 6 iterations)
4. Logs stream to web UI via Server-Sent Events (SSE)
5. PR link appears when completed

## Features

### Hard Constraints (Non-Negotiable)

- ✅ **Diff-Only Patches**: LLM must output unified diffs only (validated and enforced)
- ✅ **Deterministic Context**: ripgrep + 1-hop import resolution with 50K char cap
- ✅ **Bounded Iterations**: Max 6 iterations with explicit exit conditions
- ✅ **CI Parity Preflight**: 4-stage pipeline (lint/typecheck/test/smoke) with fail-fast
- ✅ **Strict Branch Naming**: `vibe/{task_id}` format
- ✅ **Max Diff Size**: 5000 lines (hard cap)
- ✅ **Persisted Logs**: SQLite storage with SSE streaming

## Setup

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- Git
- OpenAI API key
- GitHub Personal Access Token (with `repo` scope)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/lupobill-rgb/VIBE.git
cd VIBE
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` and set:
- `OPENAI_API_KEY`: Your OpenAI API key
- `GITHUB_TOKEN`: Your GitHub PAT with repo access
- `LINT_COMMAND`, `TYPECHECK_COMMAND`, `TEST_COMMAND`, `SMOKE_COMMAND`: Customize for your project

### Running Locally

#### Development Mode (All Services)
```bash
npm run dev
```

This starts:
- Web UI: http://localhost:3000
- API: http://localhost:3001
- Executor: Background worker

#### Individual Services
```bash
npm run dev:web       # Web UI only
npm run dev:api       # API only
npm run dev:executor  # Executor only
```

### Running with Docker Compose

```bash
docker-compose up --build
```

Services:
- Web: http://localhost:3000
- API: http://localhost:3001
- Executor: Background worker

## Usage

1. Open http://localhost:3000
2. Enter your coding prompt (e.g., "Add input validation to the login form")
3. Provide repository URL (e.g., `https://github.com/owner/repo`)
4. Set base branch (default: `main`)
5. Optionally set target branch (auto-generated if empty)
6. Click **Run**
7. Watch live logs stream in real-time
8. Get PR link when completed!

## Configuration

### Environment Variables

See `.env.example` for all available options:

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key (required) | - |
| `GITHUB_TOKEN` | GitHub PAT for PR creation (required) | - |
| `API_PORT` | API server port | `3001` |
| `MAX_ITERATIONS` | Maximum iteration attempts | `6` |
| `MAX_CONTEXT_SIZE` | Max context chars | `50000` |
| `MAX_DIFF_SIZE` | Max diff lines | `5000` |
| `LINT_COMMAND` | Lint command | `npm run lint` |
| `TYPECHECK_COMMAND` | Type check command | `npm run typecheck` |
| `TEST_COMMAND` | Test command | `npm test` |
| `SMOKE_COMMAND` | Smoke test command | `echo "Smoke test"` |

### Preflight Commands

Customize per project in `.env`:

```bash
# Example for a TypeScript project
LINT_COMMAND="npm run lint"
TYPECHECK_COMMAND="npx tsc --noEmit"
TEST_COMMAND="npm test -- --coverage"
SMOKE_COMMAND="npm run build && node dist/index.js --version"
```

## Database Schema

### vibe_tasks
```sql
task_id TEXT PRIMARY KEY
user_prompt TEXT
repository_url TEXT
source_branch TEXT
destination_branch TEXT
execution_state TEXT  -- queued|cloning|building_context|calling_llm|applying_diff|running_preflight|creating_pr|completed|failed
pull_request_link TEXT
iteration_count INTEGER
initiated_at INTEGER
last_modified INTEGER
```

### vibe_events
```sql
event_id INTEGER PRIMARY KEY
task_id TEXT
event_message TEXT
severity TEXT  -- info|error|success|warning
event_time INTEGER
```

## Lifecycle States

1. **queued**: Task created, waiting for executor
2. **cloning**: Cloning repository
3. **building_context**: Running ripgrep + import analysis
4. **calling_llm**: Requesting diff from LLM
5. **applying_diff**: Running `git apply`
6. **running_preflight**: Executing lint/typecheck/test/smoke
7. **creating_pr**: Pushing branch and opening PR
8. **completed**: Success! PR created
9. **failed**: Terminal failure (see logs)

## Exit Conditions

The executor stops when:
- ✅ **Success**: All preflight checks pass
- ❌ **Max Iterations**: 6 iterations reached
- ❌ **Git Apply Failures**: 3 consecutive apply failures
- ❌ **Invalid Diffs**: 3 consecutive invalid diffs from LLM

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Backend**: Express, TypeScript, Server-Sent Events
- **Worker**: Node.js, simple-git, ripgrep
- **Database**: better-sqlite3
- **LLM**: OpenAI GPT-4
- **Git**: simple-git + GitHub REST API
- **Container**: Docker, Docker Compose

## Development

### Project Structure
```
VIBE/
├── apps/
│   ├── web/          # React frontend
│   │   ├── src/
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── api/          # Express backend
│   │   ├── src/
│   │   ├── Dockerfile
│   │   └── package.json
│   └── executor/     # Worker process
│       ├── src/
│       ├── Dockerfile
│       └── package.json
├── data/             # SQLite database (created at runtime)
├── docker-compose.yml
├── .env.example
├── package.json      # Root workspace
└── README.md
```

### Building

```bash
npm run build
```

### Testing

```bash
# API
npm test --workspace=apps/api

# Executor
npm test --workspace=apps/executor

# Web
npm test --workspace=apps/web
```

## Troubleshooting

### Executor not picking up tasks
- Check `EXECUTOR_POLL_INTERVAL` in `.env`
- Verify database path is accessible
- Check executor logs

### LLM returns invalid diffs
- Increase `MAX_CONTEXT_SIZE` if context is truncated
- Check OpenAI API key and quota
- Review prompt in logs

### Preflight checks failing
- Verify commands work manually: `cd <repo> && npm run lint`
- Check command timeouts (`PREFLIGHT_TIMEOUT`)
- Review stage-specific logs

### PR creation fails
- Verify `GITHUB_TOKEN` has `repo` scope
- Check repository URL format
- Ensure branch doesn't already exist

## Contributing

Contributions welcome! Please open an issue or PR.

## License

MIT License - see LICENSE file for details
