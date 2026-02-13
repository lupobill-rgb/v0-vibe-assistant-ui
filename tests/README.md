# VIBE End-to-End Tests

This directory contains end-to-end tests for the VIBE pipeline.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start services in the background (in separate terminals)
npm run dev:api
npm run dev:executor

# 3. Run E2E tests
npm run test:e2e
```

## Structure

```
tests/
├── e2e/
│   ├── full-pipeline.spec.ts  # Main E2E test for complete pipeline
│   └── test-utils.ts           # Shared utilities for E2E testing
├── tsconfig.json               # TypeScript configuration for tests
└── README.md                   # This file
```

## Running Tests

### Prerequisites

1. Start the VIBE services (API and Executor):
   ```bash
   npm run dev
   ```

2. Ensure services are running on default ports:
   - API: http://localhost:3001
   - Executor: http://localhost:3002

### Run E2E Tests

From the root directory:

```bash
npm run test:e2e
```

To run with custom API URL:

```bash
API_BASE_URL=http://localhost:3001 npm run test:e2e
```

## Test Scenarios

### Full Pipeline Test (`full-pipeline.spec.ts`)

Tests the complete VIBE workflow:

1. **Project Creation**: Creates a new project via `/projects` API
2. **Job Submission**: Submits a coding task via `/jobs` API
3. **Log Collection**: Monitors SSE logs via `/jobs/:id/logs`
4. **Validation**: Verifies:
   - PR is opened successfully
   - No null pointer errors occur
   - Pipeline completes within 3 minutes

**Expected Duration**: ~180 seconds (3 minutes)

## Test Utilities

### `TestApiClient`

Simple HTTP client for API requests:

```typescript
const api = new TestApiClient({ 
  baseUrl: 'http://localhost:3001',
  timeout: 30000 
});

const project = await api.post('/projects', { name: 'test-project' });
const task = await api.get(`/jobs/${taskId}`);
```

### `collectSSE()`

Collects Server-Sent Events (SSE) from log endpoints:

```typescript
const logs: string[] = [];
await collectSSE(
  baseUrl,
  `/jobs/${jobId}/logs`,
  logs,
  {
    timeout: 180000,
    until: (log) => log.includes('PR opened')
  }
);
```

### `waitFor()`

Polls a condition with timeout:

```typescript
await waitFor(
  async () => {
    const task = await api.get(`/jobs/${jobId}`);
    return task.status === 'completed';
  },
  { timeout: 30000, interval: 1000 }
);
```

## Adding New Tests

1. Create a new `.spec.ts` file in the appropriate directory
2. Import test utilities from `./test-utils`
3. Follow the existing test structure
4. Use descriptive test names
5. Add proper assertions and error handling

Example:

```typescript
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { TestApiClient } from './test-utils';

describe('My Feature', () => {
  it('should do something', async () => {
    const api = new TestApiClient({ baseUrl: API_BASE_URL });
    // Test implementation
  });
});
```

## Troubleshooting

### Tests Timeout

- Ensure API and Executor services are running
- Check service logs for errors
- Increase timeout values if needed

### Connection Refused

- Verify services are running on expected ports
- Check firewall settings
- Try accessing endpoints manually with curl

### SSE Collection Issues

- Ensure `/jobs/:id/logs` endpoint is available
- Check that task is actually executing (not stuck in queue)
- Verify executor service is processing jobs

## Environment Variables

- `API_BASE_URL`: Base URL for the API service (default: `http://localhost:3001`)
- `TEST_TIMEOUT`: Overall test timeout in ms (default: 200000)

## CI/CD Integration

To run E2E tests in CI:

```yaml
- name: Start Services
  run: |
    npm run dev:api &
    npm run dev:executor &
    sleep 10  # Wait for services to start

- name: Run E2E Tests
  run: npm run test:e2e
  env:
    API_BASE_URL: http://localhost:3001
```
