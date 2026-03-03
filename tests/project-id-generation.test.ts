/**
 * Integration test: verifies that generateDashboard() and generateMultiPageSite()
 * include the projectId in the fetch request body when provided.
 */
import { describe, it, before, after } from 'node:test'
import assert from 'node:assert'

// Capture every fetch call's request body
const capturedBodies: Array<Record<string, unknown>> = []

// Save original fetch
const originalFetch = globalThis.fetch

before(() => {
  // Mock global fetch to return a valid response and capture request bodies
  globalThis.fetch = async (_url: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(init?.body as string)
    capturedBodies.push(body)
    return new Response(JSON.stringify({ diff: '<html>mock</html>' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

after(() => {
  globalThis.fetch = originalFetch
})

describe('generateDashboard', () => {
  it('should include projectId in the request body when provided', async () => {
    capturedBodies.length = 0
    const { generateDashboard } = await import('../lib/api.js')

    await generateDashboard('Build a metrics dashboard', 'proj-123')

    assert.strictEqual(capturedBodies.length, 1, 'Expected exactly 1 fetch call')
    assert.strictEqual(capturedBodies[0].projectId, 'proj-123', 'projectId should be in request body')
    assert.strictEqual(capturedBodies[0].model, 'claude', 'model should be claude')
    assert.ok(
      (capturedBodies[0].prompt as string).includes('Build a metrics dashboard'),
      'prompt should contain user input',
    )
  })

  it('should NOT include projectId when not provided', async () => {
    capturedBodies.length = 0
    const { generateDashboard } = await import('../lib/api.js')

    await generateDashboard('Build a dashboard')

    assert.strictEqual(capturedBodies.length, 1, 'Expected exactly 1 fetch call')
    assert.strictEqual(capturedBodies[0].projectId, undefined, 'projectId should not be present')
  })
})

describe('generateMultiPageSite', () => {
  it('should include projectId in ALL page fetch calls when provided', async () => {
    capturedBodies.length = 0
    const { generateMultiPageSite } = await import('../lib/api.js')

    const pages = await generateMultiPageSite('Build a landing page', 'proj-456')

    assert.strictEqual(capturedBodies.length, 3, 'Expected 3 fetch calls (Home, About, Contact)')
    assert.strictEqual(pages.length, 3, 'Should return 3 pages')

    for (let i = 0; i < capturedBodies.length; i++) {
      assert.strictEqual(
        capturedBodies[i].projectId,
        'proj-456',
        `Request ${i} should include projectId`,
      )
      assert.strictEqual(capturedBodies[i].model, 'claude', `Request ${i} model should be claude`)
    }
  })

  it('should NOT include projectId in any fetch call when not provided', async () => {
    capturedBodies.length = 0
    const { generateMultiPageSite } = await import('../lib/api.js')

    await generateMultiPageSite('Build a site')

    assert.strictEqual(capturedBodies.length, 3, 'Expected 3 fetch calls')
    for (let i = 0; i < capturedBodies.length; i++) {
      assert.strictEqual(
        capturedBodies[i].projectId,
        undefined,
        `Request ${i} should not have projectId`,
      )
    }
  })
})
