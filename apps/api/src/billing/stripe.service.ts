import Stripe from 'stripe';
import { getPlatformSupabaseClient } from '../supabase/client';
import { getTierLimits, TierSlug } from './tiers';

let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
  _stripe = new Stripe(key);
  return _stripe;
}

const sb = () => getPlatformSupabaseClient();

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

// ── Checkout (dynamic pricing) ──

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
  const limits = getTierLimits(tierSlug);

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: { name: limits.tierDisplayName },
          unit_amount: limits.priceMonthly,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      },
    ],
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

export async function getBillingStatus(orgId: string) {
  const { data: org } = await sb()
    .from('organizations')
    .select(
      'tier_slug, subscription_status, credits_used_this_period, current_period_end',
    )
    .eq('id', orgId)
    .single();

  const tierSlug = (org?.tier_slug || 'starter') as TierSlug;
  const limits = getTierLimits(tierSlug);

  return {
    tierSlug,
    subscriptionStatus: org?.subscription_status || 'active',
    creditsUsed: org?.credits_used_this_period || 0,
    creditsLimit: limits.creditsPerMonth,
    currentPeriodEnd: org?.current_period_end || null,
  };
}
