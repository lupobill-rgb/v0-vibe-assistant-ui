# VIBE Platform — LLM Redundancy & Failover Plan

**Version:** 1.0
**Date:** March 28, 2026
**Owner:** Bill Lupo | **Implementer:** Omid / Engineering
**Status:** Approved for implementation

---

## 1. Objective

Eliminate single-provider dependency in VIBE's NLP-to-UI pipeline. If Anthropic (primary) is unavailable, rate-limited, or degraded, VIBE must automatically route to an alternate LLM with no user-facing failure and minimal quality degradation.

---

## 2. Architecture Decision

### Recommended: LiteLLM Proxy on Railway

Deploy LiteLLM as a sidecar service on Railway alongside the existing NestJS API. VIBE's API calls route through LiteLLM, which handles provider selection, retries, failover, and timeout management transparently.

**Why LiteLLM:** Open-source (no per-call fees), self-hosted (data stays in your infra), OpenAI-compatible API (minimal code changes), deployable on Railway in the same project as the NestJS API.

### Implementation Files

| File | Purpose |
|------|---------|
| `litellm/litellm_config.yaml` | LiteLLM proxy configuration with model list and routing |
| `litellm/Dockerfile` | Docker image for Railway deployment |
| `litellm/railway.toml` | Railway service configuration |
| `apps/executor/src/llm-failover.ts` | Multi-provider failover orchestrator with JSON validation, context window checks, cost circuit breakers |
| `apps/executor/src/llm-provider.ts` | Provider abstraction (Anthropic, OpenAI, Gemini, Fireworks, LiteLLM) |
| `apps/executor/src/llm-router.ts` | Edge function client with multi-tier failover chain |
| `apps/executor/src/llm.ts` | Unified LLM router with LiteLLM proxy support |
| `supabase/functions/generate-diff/index.ts` | Edge function with 4-provider failover |

---

## 3. Provider & Model Failover Matrix

Each VIBE operation maps to a tiered fallback chain. Priority 1 is always attempted first; subsequent tiers activate only on failure, timeout (>30s), or rate limit (429/529).

### Page Building (primary pipeline)

| Priority | Provider | Model | Context Window | Cost/1M tok (in/out) |
|----------|----------|-------|----------------|----------------------|
| 1 (Primary) | Anthropic | claude-sonnet-4-20250514 | 200K | $3 / $15 |
| 2 | OpenAI | gpt-4o | 128K | $2.50 / $10 |
| 3 | Google | gemini-2.0-flash | 1M | $0.10 / $0.40 |
| 4 | DeepSeek (via Fireworks) | deepseek-v3 | 128K | $0.90 / $0.90 |

### NLP Edits (lightweight operations)

| Priority | Provider | Model | Context Window | Cost/1M tok (in/out) |
|----------|----------|-------|----------------|----------------------|
| 1 (Primary) | Anthropic | claude-haiku-4-5 | 200K | $0.80 / $4 |
| 2 | OpenAI | gpt-4o-mini | 128K | $0.15 / $0.60 |
| 3 | Google | gemini-2.0-flash | 1M | $0.10 / $0.40 |

---

## 4. Critical Design Constraints (Implemented)

### 4.1 Context Window Pre-Check (Section 6.3)

Before routing to a fallback provider, the system estimates the request token count and skips providers whose context window can't fit the request. This prevents silent truncation on multi-page builds.

Implemented in: `llm-failover.ts:fitsContextWindow()`, `llm-router.ts:CONTEXT_LIMITS`, edge function `fitsProvider()`.

### 4.2 JSON Validation Layer (Section 6.1)

A JSON validation layer between LLM response and VIBE's page renderer. If output fails JSON parse, retries once on same provider, then fails over. Handles markdown code fences and embedded JSON blocks.

Implemented in: `llm-failover.ts:validateJsonOutput()`, edge function plan mode validation.

### 4.3 No Mid-Stream Failover (Section 6.2)

Failover only occurs PRE-stream. Once streaming has begun, that provider completes or errors. No mid-stream provider switches.

Enforced by: failover chain iterates providers sequentially, each call is atomic.

### 4.4 Cost Circuit Breakers (Section 6.6)

Per-provider daily dollar caps:
- Anthropic: $300/day
- OpenAI: $200/day
- Google: $100/day
- Fireworks: $50/day

Alert at 80% of cap. If all providers hit caps, queue requests with "high demand" message.

Implemented in: `llm-failover.ts:isProviderOverBudget()`, `recordProviderSpend()`.

---

## 5. LiteLLM Configuration

See `litellm/litellm_config.yaml` for the full configuration. Key settings:

- **Routing strategy:** `simple-shuffle` (tries in order defined)
- **Retries:** 2x per provider before cascade
- **Timeout:** 30s per request
- **Daily budget cap:** $500 total across all providers
- **Cooldown:** 60s after 3 consecutive failures

---

## 6. Deployment Steps

### Phase 1: LiteLLM Deployment

1. Deploy LiteLLM Proxy as a new Railway service using `litellm/` directory
2. Set environment variables on Railway: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_API_KEY`, `FIREWORKS_API_KEY`
3. Set `LITELLM_PROXY_URL` on the NestJS API service pointing to LiteLLM's internal Railway URL
4. Validate: temporarily disable Anthropic key, confirm auto-failover to OpenAI

### Phase 2: Prompt Normalization

1. LiteLLM handles most format translation automatically
2. Audit top 5 prompts for Anthropic-specific patterns
3. Add provider-specific prompt variants only where quality degrades

### Phase 3: Observability & Tuning

1. Enable LiteLLM built-in logging
2. Set up Slack alerts for fallback rate > 5% per hour
3. Compare output quality across providers
4. Monitor per-provider spend

---

## 7. Environment Variables

| Variable | Service | Purpose |
|----------|---------|---------|
| `ANTHROPIC_API_KEY` | LiteLLM, Edge Function | Anthropic Claude API |
| `OPENAI_API_KEY` | LiteLLM, Edge Function | OpenAI GPT API |
| `GOOGLE_API_KEY` | LiteLLM, Edge Function | Google Gemini API |
| `FIREWORKS_API_KEY` | LiteLLM, Edge Function | Fireworks AI (DeepSeek) |
| `LITELLM_PROXY_URL` | NestJS API | URL of LiteLLM proxy service |

---

## 8. Monthly Chaos Test

On the first Monday of each month during low-traffic hours (6-7am ET), disable the primary provider API key for 30 minutes. Confirm:
- Failover activates within 5 seconds
- Builds complete successfully on fallback provider
- Streaming works end-to-end
- No user-facing errors
- Slack alert fires as expected

---

## Appendix: Chaos Test Log

| Date | Duration | Failover Provider | Result | Notes |
|------|----------|-------------------|--------|-------|
| — | — | — | — | First test pending after Phase 1 deployment |
