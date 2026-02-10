VIBE SMOKE TEST
# VIBE

**Vibe-coding prompt box that generates diffs, runs CI-parity preflight, and opens GitHub PRs.**

VIBE is an intelligent coding assistant that streamlines your development workflow by automatically generating code changes, running continuous integration checks, and creating GitHub pull requests—all from natural language prompts.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Local Dev (Windows)](#local-dev-windows)
- [End-to-End Usage Guide](#end-to-end-usage-guide)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Features

- 🤖 **Natural Language Prompts**: Describe what you want to build in plain English
- 🔄 **Automatic Diff Generation**: VIBE generates code changes based on your prompts
- 🚫 **No-Op Detection**: Intelligently detects when no changes are needed and skips unnecessary operations
- ✅ **CI-Parity Preflight Checks**: Run the same checks locally that would run in CI
- 🚀 **Automated PR Creation**: Open pull requests directly from the command line
- 🔍 **Code Review Integration**: Get automated feedback before submitting
- 🛡️ **Security Scanning**: Built-in CodeQL vulnerability detection

## Architecture

VIBE supports two operational modes:

### Mode A: Project-Based (Recommended)

**Status**: In Development

Mode A is designed for managing persistent projects with pre-imported repositories. This mode provides:

- **Project Management**: Create and manage multiple projects
- **GitHub Repository Import**: Import repositories from GitHub into local storage
- **Persistent Storage**: Projects are stored in `/data/repos` with associated metadata
- **Worktree Isolation**: Each job execution uses dedicated worktrees in `/data/worktrees`
- **Efficient Operations**: No need to re-clone repositories for each job

#### Data Directory Layout

```
/data/
├── vibe.db              # SQLite database (tasks, events, projects)
├── repos/               # Permanent repository storage
│   ├── <project-1>/     # Git repository for project 1
│   ├── <project-2>/     # Git repository for project 2
│   └── ...
├── worktrees/           # Temporary worktrees for isolated testing
│   ├── <task-id-1>/     # Worktree for task 1
│   ├── <task-id-2>/     # Worktree for task 2
│   └── ...
└── patches/             # Failed patches for debugging
    ├── <task-id>-iter1.diff
    └── ...
```

#### How Mode A Works

1. **Create Project**: Define a project with a unique ID and description
2. **Import Repository**: Import a GitHub repository into `/data/repos/<project-id>`
3. **Run Jobs**: Submit prompts against the project
4. **Isolated Execution**: Each job creates a temporary worktree in `/data/worktrees/<task-id>`
5. **Apply Changes**: Validated diffs are applied and changes are committed
6. **Create PR**: Push to target branch and open pull request
7. **Cleanup**: Worktrees are automatically removed after completion

#### Mode A Commands (Coming Soon)

```bash
# Create a new project
vibe project create my-app --description "My application"

# Import a GitHub repository
vibe project import my-app https://github.com/owner/repo

# List projects
vibe project list

# Run a job against a project
vibe job create my-app --prompt "Add user authentication"

# View project details
vibe project show my-app
```

### Mode B: Direct Repository URL (Legacy)

**Status**: Fully Functional

Mode B is the current implementation that accepts a `repo_url` parameter for each job. This mode:

- Clones the repository fresh for each job into temporary storage
- Executes the job in the cloned repository
- Cleans up the clone after completion
- **Use Case**: Quick one-off jobs without project setup
- **Limitation**: Less efficient for repeated operations on the same repository

#### When to Use Mode B

- Quick experimentation with a repository
- One-time fixes or updates
- No need for project persistence
- Legacy API compatibility

#### Mode B API Example

```bash
# POST /jobs
{
  "prompt": "Add error handling to login function",
  "repo_url": "https://github.com/owner/repo",
  "base_branch": "main",
  "target_branch": "vibe/add-error-handling"
}
```

> **Note**: Mode B will remain supported for backward compatibility and quick operations, but Mode A is recommended for regular use once available.

## Prerequisites

Before using VIBE, ensure you have the following installed and configured:

- **Git** (version 2.0 or higher)
  ```bash
  git --version
  ```

- **GitHub CLI** (`gh`) for PR automation
  ```bash
  gh --version
  ```

- **Node.js** (if working with JavaScript/TypeScript projects)
  ```bash
  node --version
  npm --version
  ```

- **GitHub Personal Access Token** with the following scopes:
  - `repo` (full control of private repositories)
  - `workflow` (update GitHub Actions workflows)
  - `read:org` (read organization data)

## Installation

### Step 1: Install VIBE

```bash
# Clone the repository
git clone https://github.com/lupobill-rgb/VIBE.git
cd VIBE

# Install dependencies (if any)
npm install  # or yarn install / pip install -r requirements.txt
```

### Step 2: Authenticate with GitHub

```bash
# Login to GitHub CLI
gh auth login

# Follow the prompts to authenticate
# Choose: GitHub.com > HTTPS > Authenticate via web browser
# Or paste your personal access token when prompted
```

### Step 3: Verify Installation

```bash
# Check GitHub authentication status
gh auth status

# Verify you can access your repositories
gh repo list
```

## Configuration

### Environment Variables

Create a `.env` file in the project root (or export these variables):

```bash
# Required: GitHub Personal Access Token
GITHUB_TOKEN=ghp_your_token_here

# Optional: Default repository
VIBE_DEFAULT_REPO=owner/repo-name

# Optional: CI check timeout (seconds)
VIBE_CI_TIMEOUT=300

# Optional: Enable verbose logging
VIBE_DEBUG=true
```

### GitHub Permissions

Ensure your GitHub token has access to:
- Create branches
- Push commits
- Open pull requests
- Run workflows
- Read repository contents

### Repository Setup

Initialize VIBE in your target repository:

```bash
# Navigate to your project
cd /path/to/your/project

# Initialize VIBE configuration
vibe init

# This creates a .vibe/ directory with:
# - .vibe/config.json (project-specific settings)
# - .vibe/prompts/ (saved prompt templates)
# - .vibe/history/ (past generation history)
```

## Local Dev (Windows)

Set environment variables in `.env` file:
- `OPENAI_API_KEY` - Your OpenAI API key
- `GITHUB_TOKEN` - Personal access token with:
  - `repo` scope (full repository access)
  - Contents: Read and Write
  - Pull requests: Read and Write

## End-to-End Usage Guide

This section walks through complete workflows for both operational modes.

### Mode A Workflow: Project-Based (Recommended)

> **Note**: Mode A is currently in development. These instructions will be available in a future release.

#### 1. Create a Project

```bash
# Create a new project
vibe project create my-web-app --description "My web application"

# Output: Project 'my-web-app' created successfully
```

#### 2. Import a GitHub Repository

```bash
# Import repository into the project
vibe project import my-web-app https://github.com/myorg/my-repo

# This clones the repo to /data/repos/my-web-app
# Output: Repository imported successfully
```

#### 3. Run a Job Against the Project

```bash
# Submit a prompt for the project
vibe job create my-web-app --prompt "Add user authentication with JWT"

# The system will:
# - Create a worktree in /data/worktrees/<task-id>
# - Generate a diff using LLM
# - Validate the diff
# - Apply changes in isolation
# - Run preflight checks (lint, test, build)
# - Create a pull request
```

#### 4. Monitor Job Progress

```bash
# View job status
vibe job status <task-id>

# Stream job logs in real-time
vibe job logs <task-id> --follow

# View all jobs for a project
vibe job list my-web-app
```

#### 5. Review and Merge

```bash
# View the generated PR link in job output
# Review changes on GitHub
# Merge when ready
```

### Mode B Workflow: Direct Repository URL (Legacy)

This is the current implementation using the REST API.

#### 1. Start VIBE Services

```bash
# Start all services (API, Executor, Web UI)
docker-compose up -d

# Or run individually:
npm run dev:api      # API server on port 3001
npm run dev:executor # Executor service
npm run dev:web      # Web UI on port 5173
```

#### 2. Create a Job via API

```bash
# Using curl
curl -X POST http://localhost:3001/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Add error handling to the login endpoint",
    "repo_url": "https://github.com/myorg/my-repo",
    "base_branch": "main",
    "target_branch": "vibe/add-error-handling"
  }'

# Response:
# {
#   "task_id": "abc123...",
#   "status": "queued",
#   "message": "Task created successfully"
# }
```

#### 3. Monitor Job Status

```bash
# Get job status
curl http://localhost:3001/jobs/<task-id>

# Stream logs via Server-Sent Events
curl -N http://localhost:3001/jobs/<task-id>/logs

# Or use the Web UI at http://localhost:5173
```

#### 4. Review the Pull Request

The job will output a pull request URL when complete:

```bash
# Check final status
curl http://localhost:3001/jobs/<task-id>

# Response includes:
# {
#   "execution_state": "completed",
#   "pull_request_link": "https://github.com/myorg/my-repo/pull/123",
#   ...
# }
```

### Step-by-Step Execution Process (Both Modes)

Regardless of mode, each job follows this execution flow:

1. **Cloning** (Mode B) or **Worktree Creation** (Mode A)
   - Mode A: Creates isolated worktree from `/data/repos/<project>`
   - Mode B: Clones repository to temporary location

2. **Building Context**
   - Scans repository for relevant files using ripgrep
   - Extracts file content and resolves imports
   - Builds context prompt for LLM

3. **Calling LLM**
   - Sends context + user prompt to GPT-4
   - LLM generates unified diff
   - Validates diff format and structure
   - Performs pre-apply sanity checks:
     - Rejects attempts to create existing files (e.g., `--- /dev/null` for existing files)
     - Rejects file deletion without explicit request
   - Retries up to 3 times on validation failure

4. **Applying Diff**
   - Creates temporary worktree for isolation testing
   - Runs `git apply --check` in worktree
   - If successful, applies to main working directory
   - Cleans up temporary worktree (guaranteed via finally block)

5. **Running Preflight**
   - Executes linting (`npm run lint`)
   - Runs type checking (`npm run typecheck`)
   - Runs tests (`npm test`)
   - All checks must pass to proceed

6. **Creating PR**
   - Commits changes with descriptive message
   - Pushes to target branch
   - Opens pull request via GitHub API
   - Links PR in job record

7. **Completion**
   - Mode A: Removes worktree from `/data/worktrees`
   - Mode B: Removes entire clone directory
   - Sets job state to `completed` or `failed`

### Iteration and Retry Logic

VIBE includes intelligent retry mechanisms:

- **Max Iterations**: 6 attempts per job
- **LLM Retries**: Up to 3 attempts for valid diff generation
- **Validation Feedback**: Includes specific error messages in retry prompts
- **Fallback Modes**: After 2 consecutive apply failures, switches to full-file replacement
- **Failed Patches**: Saves to `/data/patches/<task-id>-iter<N>.diff` for debugging

### Step 1: Start with a Prompt (Legacy CLI - Deprecated)

> **Note**: The CLI examples below are from legacy documentation and may not reflect current implementation.

Describe what you want to implement in natural language:

```bash
vibe prompt "Add user authentication with JWT tokens to the Express API"
```

Or use the interactive mode:

```bash
vibe interactive
# Then type your prompt at the VIBE> prompt
```

### Step 2: Review Generated Changes

VIBE will:
1. Analyze your codebase structure
2. Generate appropriate code changes
3. Show you a diff of proposed modifications

```bash
# Review the diff
vibe diff

# See which files will be modified
vibe status

# Preview specific file changes
vibe show src/auth/jwt.js
```

### Step 3: Run Preflight Checks

Before creating a PR, run the same checks that would run in CI:

```bash
# Run all preflight checks
vibe preflight

# This includes:
# - Linting (ESLint, Pylint, etc.)
# - Unit tests
# - Integration tests
# - Security scans (CodeQL)
# - Build verification
```

**Expected Output:**
```
✓ Linting passed (0 errors, 0 warnings)
✓ Unit tests passed (247/247)
✓ Integration tests passed (45/45)
✓ Security scan passed (0 vulnerabilities)
✓ Build successful
```

### Step 4: Address Any Issues

If preflight checks fail:

```bash
# View detailed error logs
vibe logs

# Fix issues interactively
vibe fix

# Or manually edit and re-check
vim src/problematic-file.js
vibe preflight --file src/problematic-file.js
```

### Step 5: Create Pull Request

Once all checks pass, create the PR:

```bash
# Create PR with default settings
vibe pr create

# Or customize the PR
vibe pr create \
  --title "feat: Add JWT authentication" \
  --body "Implements user authentication with JSON Web Tokens" \
  --base main \
  --draft  # Create as draft PR
```

**Expected Output:**
```
Creating pull request for your-username/your-repo...
✓ Branch created: vibe/add-jwt-auth
✓ Commits pushed
✓ Pull request opened: #123
🔗 https://github.com/your-username/your-repo/pull/123
```

### Step 6: Monitor CI Progress

VIBE can monitor your PR's CI status:

```bash
# Watch CI checks in real-time
vibe ci watch

# Or check status once
vibe ci status
```

### Step 7: Handle Review Feedback

If reviewers request changes:

```bash
# Fetch review comments
vibe pr reviews

# Apply suggested changes
vibe apply-review-suggestions

# Or create a new prompt based on feedback
vibe prompt "Address reviewer feedback: improve error handling"

# Push updates to the same PR
vibe pr update
```

### Step 8: Merge

Once approved, merge the PR:

```bash
# Merge via VIBE
vibe pr merge

# Or merge through GitHub CLI
gh pr merge 123 --squash
```

## Examples

### Example 1: Add a New Feature

```bash
# Simple feature addition
vibe prompt "Add pagination to the user list endpoint with page size limit of 50"

# Review changes
vibe diff

# Run checks
vibe preflight

# Create PR
vibe pr create --title "feat: Add pagination to user list"
```

### Example 2: Fix a Bug

```bash
# Bug fix with context
vibe prompt "Fix memory leak in websocket connection handler that occurs after 100 concurrent connections"

# Target specific tests
vibe preflight --tests "websocket*"

# Create PR
vibe pr create --title "fix: Resolve websocket memory leak" --labels bug,high-priority
```

### Example 3: Refactoring

```bash
# Large refactoring task
vibe prompt "Refactor authentication module to use async/await instead of callbacks"

# Review impact
vibe diff --stat

# Run full test suite
vibe preflight --full

# Create draft PR for review
vibe pr create --draft --title "refactor: Modernize auth module"
```

### Example 4: Documentation Update

```bash
# Documentation changes
vibe prompt "Update API documentation for all endpoints in the /api/v2 namespace"

# Skip tests for docs-only changes
vibe preflight --skip-tests

# Create PR
vibe pr create --title "docs: Update v2 API documentation"
```

### Example 5: Batch Processing

```bash
# Process multiple prompts from a file
cat prompts.txt | vibe batch

# Or use a prompt file
vibe batch --file prompts.txt

# Each prompt creates a separate PR
```

### Example 6: No-Op Detection

VIBE intelligently detects when the requested changes are already implemented:

```bash
# Request a change that's already in place
vibe prompt "Add error handling to the login endpoint"

# VIBE analyzes the code and responds
# Output:
# ℹ No changes needed - skipping git apply
# ℹ Running preflight checks...
# ✓ All preflight checks passed!
# ✓ No changes; no PR created.

# The task completes successfully without creating an unnecessary PR
```

**Benefits:**
- Saves time by avoiding redundant operations
- Prevents cluttering your repository with empty PRs
- Still runs preflight checks to verify code quality
- Provides clear feedback about why no PR was created

## Troubleshooting

### Authentication Issues

**Problem**: `gh: authentication failed`

**Solution**:
```bash
# Re-authenticate
gh auth logout
gh auth login

# Or set token directly
export GITHUB_TOKEN=ghp_your_token_here
gh auth status
```

### Preflight Checks Failing

**Problem**: Tests pass locally but fail in preflight

**Solution**:
```bash
# Clean and reset environment
vibe clean

# Re-run with verbose logging
vibe preflight --verbose

# Check environment differences
vibe env diff
```

### PR Creation Fails

**Problem**: `Error: Cannot create pull request`

**Solution**:
```bash
# Ensure you're on a different branch than base
git branch

# Check remote is up to date
git fetch origin

# Verify permissions
gh repo view --json permissions

# Try creating PR manually to test permissions
gh pr create
```

### Diff Generation Issues

**Problem**: VIBE generates incorrect or incomplete code

**Solution**:
```bash
# Provide more context in your prompt
vibe prompt "Add error handling to user service [context: current code uses Express middleware for errors]"

# Or use a more specific prompt
vibe prompt --file detailed-requirements.md

# Review and edit before committing
vibe edit
```

### Large Repository Performance

**Problem**: VIBE is slow on large codebases

**Solution**:
```bash
# Use focused mode to analyze only relevant files
vibe prompt --focus "src/auth/**/*.js" "Add rate limiting"

# Or exclude certain directories
vibe config set ignore "node_modules,dist,build,*.log"

# Enable caching
vibe config set cache.enabled true
```

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Quick Start for Contributors

```bash
# Fork and clone the repository
gh repo fork lupobill-rgb/VIBE --clone

# Create a feature branch
git checkout -b feature/your-feature

# Make changes and test
npm test

# Submit a PR
gh pr create --title "feat: your feature" --fill
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Need Help?**
- 📖 [Documentation](https://github.com/lupobill-rgb/VIBE/wiki)
- 💬 [Discussions](https://github.com/lupobill-rgb/VIBE/discussions)
- 🐛 [Report Issues](https://github.com/lupobill-rgb/VIBE/issues)
