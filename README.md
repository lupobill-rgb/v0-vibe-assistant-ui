VIBE SMOKE TEST
# VIBE

**Vibe-coding prompt box that generates diffs, runs CI-parity preflight, and opens GitHub PRs.**

VIBE is an intelligent coding assistant that streamlines your development workflow by automatically generating code changes, running continuous integration checks, and creating GitHub pull requests—all from natural language prompts.

## Table of Contents

- [Features](#features)
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

## Architecture: Option A (Project-Centric)

VIBE uses a **project-centric architecture** where projects are first-class entities:

### Core Concepts

1. **Project Repository Cache** (`/data/repos/<projectId>`)
   - VIBE maintains a persistent cache of project repositories
   - Each project has a unique ID and is stored at `/data/repos/<projectId>`
   - Projects can be created from templates or imported from GitHub
   - No repeated cloning - projects persist between jobs

2. **Per-Job Worktrees** (`/data/worktrees/<jobId>`)
   - Each job operates in an isolated worktree at `/data/worktrees/<jobId>`
   - Worktrees provide clean, isolated environments for each job
   - Changes are made in the worktree and synced back to the main repo
   - Worktrees are automatically cleaned up after job completion

3. **Deterministic LLM Configuration**
   - Temperature set to 0 for consistent, deterministic outputs
   - Strict diff validation with automatic retries (max 2)
   - Pre-apply sanity checks prevent common errors

### Job Execution Flow

```
1. User submits prompt + project_id
2. Executor creates worktree from project repo
3. Build context from worktree
4. Call LLM with context (temperature 0)
5. Validate diff (strict rules)
6. Apply diff to worktree
7. Commit changes
8. Run preflight checks from worktree
9. Push branch and create PR
10. Clean up worktree (always, in finally block)
```

### Legacy Mode B (repo_url)

For backward compatibility, VIBE supports a legacy mode where jobs can be run with `repo_url` instead of `project_id`. This mode:
- Clones the repository to a temporary directory
- Is NOT recommended for normal use
- Should only be used for one-off tasks or migration scenarios
- Will eventually be deprecated

**Recommendation**: Use project-centric mode (Option A) for all new workflows.

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
# Required: OpenAI API Key
OPENAI_API_KEY=sk-your-key-here

# Required: GitHub Personal Access Token
GITHUB_TOKEN=ghp_your_token_here

# Optional: Base directories for projects and worktrees
REPOS_BASE_DIR=/data/repos
WORKTREES_BASE_DIR=/data/worktrees

# Optional: Database path
DATABASE_PATH=./data/vibe.db

# Optional: CI check timeout (seconds)
VIBE_CI_TIMEOUT=300

# Optional: Enable verbose logging
VIBE_DEBUG=true
```

### Directory Structure

VIBE uses the following directory structure:

```
/data/
├── repos/              # Project repository cache
│   ├── <projectId1>/   # Persistent project repo
│   ├── <projectId2>/
│   └── ...
├── worktrees/          # Per-job worktrees
│   ├── <jobId1>/       # Isolated worktree for job 1
│   ├── <jobId2>/       # Isolated worktree for job 2
│   └── ...             # (cleaned up after job completes)
└── patches/            # Failed patches for debugging
    ├── <taskId>-iter1.diff
    └── ...
```

**Key Points:**
- `/data/repos`: Persistent storage for project repositories
- `/data/worktrees`: Temporary, per-job isolated environments
- Worktrees are automatically cleaned up in finally blocks
- Each job gets its own isolated worktree

### GitHub Permissions

Ensure your GitHub token has access to:
- Create branches
- Push commits
- Open pull requests
- Run workflows
- Read repository contents

### Project Management

VIBE organizes work around projects. Before running jobs, you need to create or import a project:

#### Creating a New Project from Template

```bash
# Via API
curl -X POST http://localhost:3001/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "my-awesome-project", "template": "empty"}'

# Via UI
# 1. Click "Create Project" button
# 2. Enter project name
# 3. Click "Create"
```

This creates:
- A new git repository at `/data/repos/<projectId>`
- An initial commit with a README
- Default branch (usually `main`)

#### Importing from GitHub

```bash
# Via API
PROJECT_ID=$(uuidgen)
curl -X POST http://localhost:3001/projects/$PROJECT_ID/import/github \
  -H "Content-Type: application/json" \
  -d '{"repo_url": "https://github.com/owner/repo"}'

# Via UI
# 1. Click "Import from GitHub" button
# 2. Enter repository URL
# 3. Click "Import"
```

This:
- Clones the repository to `/data/repos/<projectId>`
- Preserves all branches and history
- Makes the project available for VIBE jobs

#### Listing Projects

```bash
# Via API
curl http://localhost:3001/projects

# Via UI
# Projects appear in the dropdown selector
```

#### Running Jobs on Projects

```bash
# Via API
curl -X POST http://localhost:3001/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "your-project-id",
    "prompt": "Add error handling to the API endpoints"
  }'

# Via UI
# 1. Select project from dropdown
# 2. Enter your prompt
# 3. Click "Run"
```

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

This section walks through a complete workflow from prompt to merged PR.

### Step 1: Start with a Prompt

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
