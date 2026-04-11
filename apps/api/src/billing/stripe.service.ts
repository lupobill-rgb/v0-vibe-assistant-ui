import Stripe from 'stripe';
import { getPlatformSupabaseClient } from '../supabase/client';
import {
  getTierLimits,
  TierSlug,
  getSeatPriceCents,
  INCLUDED_TOKENS_PER_USER,
  OVERAGE_RATE_PER_1K_TOKENS_CENTS,
  TRIAL_DURATION_DAYS,
  TRIAL_TOKEN_MARKUP_MULTIPLIER,
} from './tiers';

let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
  _stripe = new Stripe(key);
  return _stripe;
}

const sb = () => getPlatformSupabaseClient();

// ── Cost rates from DB ──

interface CostRate {
  provider: string;
  model: string;
  input_per_million: number;
  output_per_million: number;
}

/**
 * Read LLM cost rates from the cost_rates table.
 * Falls back to hardcoded defaults if the table is empty/missing.
 */
export async function getCostRates(): Promise<CostRate[]> {
  const { data, error } = await sb()
    .from('cost_rates')
    .select('provider, model, input_per_million, output_per_million')
    .is('effective_until', null)
    .order('provider');

  if (error || !data || data.length === 0) {
    return [
      { provider: 'anthropic', model: 'claude', input_per_million: 3.0, output_per_million: 15.0 },
      { provider: 'openai', model: 'gpt', input_per_million: 10.0, output_per_million: 30.0 },
    ];
  }
  return data;
}

/** Compute blended cost for a set of tokens using rates from DB. */
export async function computeTokenCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): Promise<number> {
  const rates = await getCostRates();
  const match = rates.find((r) => model.includes(r.model)) || rates[0];
  const inputCost = (inputTokens / 1_000_000) * match.input_per_million;
  const outputCost = (outputTokens / 1_000_000) * match.output_per_million;
  return inputCost + outputCost;
}

// ── Customer management ──

export async function createOrGetCustomer(
  orgId: string,
  email: string,
  orgName: string,
): Promise<string> {
  const { data: org } = await sb()
    .from('organizations')
    .select('stripe_customer_id')
    .eq('id', orgId)
    .single();

  if (org?.stripe_customer_id) return org.stripe_customer_id;

  const customer = await getStripe().customers.create({
    email,
    name: orgName,
    metadata: { orgId },
  });

  await sb()
    .from('organizations')
    .update({ stripe_customer_id: customer.id })
    .eq('id', orgId);

  return customer.id;
}

// ── Trial status ──

export interface TrialStatus {
  inTrial: boolean;
  trialEndsAt: string | null;
  daysRemaining: number;
  billingModel: string;
}

export async function getTrialStatus(orgId: string): Promise<TrialStatus> {
  const { data } = await sb()
    .from('organizations')
    .select('trial_started_at, trial_ends_at, billing_model')
    .eq('id', orgId)
    .single();

  const org = data as { trial_started_at: string | null; trial_ends_at: string | null; billing_model: string | null } | null;

  if (!org?.trial_ends_at) {
    return { inTrial: false, trialEndsAt: null, daysRemaining: 0, billingModel: 'seat_token' };
  }

  const endsAt = new Date(org.trial_ends_at);
  const now = new Date();
  const daysRemaining = Math.max(0, Math.ceil((endsAt.getTime() - now.getTime()) / 86_400_000));

  return {
    inTrial: daysRemaining > 0,
    trialEndsAt: org.trial_ends_at,
    daysRemaining,
    billingModel: org.billing_model || 'seat_token',
  };
}

// ── Checkout (seat-based pricing) ──

export async function createCheckoutSession(
  orgId: string,
  tierSlug: TierSlug,
  email: string,
  orgName: string,
  successUrl: string,
  cancelUrl: string,
): Promise<string> {
  if (tierSlug === 'starter' || tierSlug === 'enterprise') {
    throw new Error(`Cannot checkout ${tierSlug} tier via Stripe`);
  }

  const customerId = await createOrGetCustomer(orgId, email, orgName);

  // Get active user count for volume discount
  const { data: orgData } = await sb()
    .from('organizations')
    .select('active_user_count')
    .eq('id', orgId)
    .single();
  const orgRow = orgData as { active_user_count: number | null } | null;
  const userCount = Math.max(1, orgRow?.active_user_count || 1);
  const seatPrice = getSeatPriceCents(userCount);

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `VIBE — ${userCount} seat${userCount > 1 ? 's' : ''}`,
            metadata: { tierSlug },
          },
          unit_amount: seatPrice,
          recurring: { interval: 'month' },
        },
        quantity: userCount,
      },
    ],
    subscription_data: {
      trial_period_days: TRIAL_DURATION_DAYS,
      metadata: { orgId, tierSlug, billingModel: 'seat_token' },
    },
    metadata: { orgId, tierSlug },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  if (!session.url) throw new Error('Stripe did not return a checkout URL');
  return session.url;
}

// ── Billing portal ──

export async function createBillingPortalSession(
  orgId: string,
): Promise<string> {
  const { data: org } = await sb()
    .from('organizations')
    .select('stripe_customer_id')
    .eq('id', orgId)
    .single();

  if (!org?.stripe_customer_id) {
    throw new Error('Organization has no Stripe customer');
  }

  const session = await getStripe().billingPortal.sessions.create({
    customer: org.stripe_customer_id,
  });

  return session.url;
}

// ── Webhook processing ──

export function constructWebhookEvent(
  rawBody: Buffer,
  signature: string,
): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  return getStripe().webhooks.constructEvent(rawBody, signature, secret);
}

export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const orgId = session.metadata?.orgId;
      const tierSlug = session.metadata?.tierSlug;
      if (!orgId || !tierSlug) break;

      await sb()
        .from('organizations')
        .update({
          tier_slug: tierSlug,
          subscription_status: 'active',
          billing_model: 'seat_token',
          stripe_subscription_id:
            typeof session.subscription === 'string'
              ? session.subscription
              : null,
        })
        .eq('id', orgId);
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const orgId = sub.metadata?.orgId;
      if (!orgId) break;

      await sb()
        .from('organizations')
        .update({
          subscription_status: sub.status === 'active' ? 'active' : sub.status,
          current_period_end: new Date(
            sub.items.data[0]?.current_period_end
              ? sub.items.data[0].current_period_end * 1000
              : Date.now(),
          ).toISOString(),
        })
        .eq('id', orgId);
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const { data: orgs } = await sb()
        .from('organizations')
        .select('id')
        .eq('stripe_subscription_id', sub.id);

      if (orgs && orgs.length > 0) {
        await sb()
          .from('organizations')
          .update({
            tier_slug: 'starter',
            subscription_status: 'canceled',
            stripe_subscription_id: null,
          })
          .eq('id', orgs[0].id);
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId =
        typeof invoice.customer === 'string'
          ? invoice.customer
          : invoice.customer?.id;
      if (!customerId) break;

      await sb()
        .from('organizations')
        .update({ subscription_status: 'past_due' })
        .eq('stripe_customer_id', customerId);
      break;
    }
  }
}

// ── Billing status ──

interface OrgBillingRow {
  tier_slug: string | null;
  subscription_status: string | null;
  credits_used_this_period: number | null;
  current_period_end: string | null;
  billing_model: string | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  active_user_count: number | null;
  tokens_used_this_period: number | null;
  tokens_included_this_period: number | null;
}

export async function getBillingStatus(orgId: string) {
  const { data } = await sb()
    .from('organizations')
    .select(
      'tier_slug, subscription_status, credits_used_this_period, current_period_end, ' +
      'billing_model, trial_started_at, trial_ends_at, active_user_count, ' +
      'tokens_used_this_period, tokens_included_this_period',
    )
    .eq('id', orgId)
    .single();

  const org = data as OrgBillingRow | null;
  const tierSlug = (org?.tier_slug || 'starter') as TierSlug;
  const limits = getTierLimits(tierSlug);
  const activeUsers = org?.active_user_count || 1;
  const tokensUsed = org?.tokens_used_this_period || 0;
  const tokensIncluded = org?.tokens_included_this_period || (INCLUDED_TOKENS_PER_USER * activeUsers);

  // Trial status
  const trialEndsAt = org?.trial_ends_at ? new Date(org.trial_ends_at) : null;
  const inTrial = trialEndsAt ? trialEndsAt.getTime() > Date.now() : false;

  return {
    tierSlug,
    subscriptionStatus: org?.subscription_status || 'active',
    creditsUsed: org?.credits_used_this_period || 0,
    creditsLimit: limits.creditsPerMonth,
    currentPeriodEnd: org?.current_period_end || null,
    // New seat+token fields
    billingModel: org?.billing_model || 'seat_token',
    inTrial,
    trialEndsAt: org?.trial_ends_at || null,
    activeUsers,
    tokensUsed,
    tokensIncluded,
    seatPriceCents: getSeatPriceCents(activeUsers),
    overageRatePer1kCents: OVERAGE_RATE_PER_1K_TOKENS_CENTS,
  };
}

// ── Token usage metering ──

export async function recordTokenUsage(
  orgId: string,
  userId: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
): Promise<void> {
  const totalTokens = inputTokens + outputTokens;
  const cost = await computeTokenCost(model, inputTokens, outputTokens);
  const periodStart = new Date();
  periodStart.setDate(1);
  const periodKey = periodStart.toISOString().split('T')[0];

  // Upsert per-user per-period usage
  await sb().rpc('upsert_token_usage', {
    p_org_id: orgId,
    p_user_id: userId,
    p_period_start: periodKey,
    p_input_tokens: inputTokens,
    p_output_tokens: outputTokens,
    p_total_tokens: totalTokens,
    p_cost_usd: cost,
  });

  // Update org-level aggregate via RPC (atomic increment)
  await sb().rpc('increment_org_tokens', {
    p_org_id: orgId,
    p_tokens: totalTokens,
  });
}

export async function getTokenUsageSummary(orgId: string) {
  const periodStart = new Date();
  periodStart.setDate(1);
  const periodKey = periodStart.toISOString().split('T')[0];

  const { data } = await sb()
    .from('token_usage')
    .select('user_id, total_tokens, estimated_cost_usd')
    .eq('org_id', orgId)
    .eq('period_start', periodKey);

  const { data: orgRow } = await sb()
    .from('organizations')
    .select('active_user_count, tokens_used_this_period, trial_ends_at')
    .eq('id', orgId)
    .single();

  const org = orgRow as { active_user_count: number | null; tokens_used_this_period: number | null; trial_ends_at: string | null } | null;
  const activeUsers = org?.active_user_count || 1;
  const totalUsed = org?.tokens_used_this_period || 0;
  const included = INCLUDED_TOKENS_PER_USER * activeUsers;
  const overage = Math.max(0, totalUsed - included);
  const overageCostCents = Math.ceil((overage / 1000) * OVERAGE_RATE_PER_1K_TOKENS_CENTS);

  const trialEndsAt = org?.trial_ends_at ? new Date(org.trial_ends_at) : null;
  const inTrial = trialEndsAt ? trialEndsAt.getTime() > Date.now() : false;

  return {
    periodStart: periodKey,
    activeUsers,
    totalTokensUsed: totalUsed,
    tokensIncluded: included,
    tokensOverage: overage,
    overageCostCents,
    inTrial,
    trialMarkupMultiplier: inTrial ? TRIAL_TOKEN_MARKUP_MULTIPLIER : 1.0,
    perUserBreakdown: data || [],
  };
}
