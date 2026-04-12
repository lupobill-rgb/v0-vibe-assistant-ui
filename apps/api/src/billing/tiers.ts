export type TierSlug = 'starter' | 'pro' | 'growth' | 'team' | 'portfolio' | 'enterprise';

export interface TierLimits {
  workspaces: number;
  builders: number;
  projects: number;   // -1 = unlimited
  creditsPerMonth: number; // -1 = unlimited (legacy, kept for compat)
  connectors: number; // -1 = unlimited
  priceMonthly: number;   // cents (USD) — legacy flat rate for builder tiers
  tierDisplayName: string;
}

/**
 * Seat-based pricing model (replaces flat-tier billing).
 *
 * FREE TRIAL (Day 1–30):  full access, no seat fee, token usage at markup
 * STANDARD  (Day 30+):    $17/user/month + 750K tokens included/user/month
 * VOLUME DISCOUNTS:       applied automatically by active user count
 * ENTERPRISE:             custom, floor $10/user/month
 *
 * Builder persona tiers (starter/pro/growth/team/portfolio) remain for
 * feature gating — they do NOT drive billing.  Billing is seat + tokens.
 */

// ── Seat pricing ─────────────────────────────────────────────────────────

export interface SeatPricingTier {
  minUsers: number;
  maxUsers: number;       // -1 = unlimited
  seatPriceCents: number; // per user per month
}

export const SEAT_PRICING_TIERS: SeatPricingTier[] = [
  { minUsers: 1,     maxUsers: 499,   seatPriceCents: 1700 },
  { minUsers: 500,   maxUsers: 2499,  seatPriceCents: 1500 },
  { minUsers: 2500,  maxUsers: 9999,  seatPriceCents: 1200 },
  { minUsers: 10000, maxUsers: -1,    seatPriceCents: 1000 },
];

export const ENTERPRISE_FLOOR_CENTS = 1000; // $10/user/month minimum

// ── Token allocation ─────────────────────────────────────────────────────

/** Included tokens per user per month on Standard plan */
export const INCLUDED_TOKENS_PER_USER = 750_000;

/** Overage rate: $0.005 per 1K tokens = 0.5 cents per 1K tokens */
export const OVERAGE_RATE_PER_1K_TOKENS_CENTS = 0.5;

// ── Trial configuration ──────────────────────────────────────────────────

/** Free trial duration in days */
export const TRIAL_DURATION_DAYS = 30;

/**
 * Trial token markup multiplier.
 * Blended LLM cost baseline: ~$2.84/user/month.
 * Trial bills at 500% markup on that baseline.
 * Actual cost rates are read from DB `cost_rates` table at runtime.
 */
export const TRIAL_TOKEN_MARKUP_MULTIPLIER = 5.0;

// ── Helpers ──────────────────────────────────────────────────────────────

/** Get the seat price in cents for a given active user count. */
export function getSeatPriceCents(activeUserCount: number): number {
  for (const tier of SEAT_PRICING_TIERS) {
    if (
      activeUserCount >= tier.minUsers &&
      (tier.maxUsers === -1 || activeUserCount <= tier.maxUsers)
    ) {
      return tier.seatPriceCents;
    }
  }
  return SEAT_PRICING_TIERS[0].seatPriceCents;
}

/** Calculate total monthly seat cost for an org. */
export function calcMonthlySeatCost(activeUserCount: number): number {
  return getSeatPriceCents(activeUserCount) * activeUserCount;
}

/** Calculate token overage cost in cents. */
export function calcOverageCents(
  totalTokensUsed: number,
  activeUserCount: number,
): number {
  const included = INCLUDED_TOKENS_PER_USER * activeUserCount;
  const overage = totalTokensUsed - included;
  if (overage <= 0) return 0;
  return Math.ceil((overage / 1000) * OVERAGE_RATE_PER_1K_TOKENS_CENTS);
}

// ── Builder persona tiers (feature gating only) ──────────────────────────

const TIER_LIMITS: Record<TierSlug, TierLimits> = {
  starter: {
    workspaces: 1,
    builders: 1,
    projects: 3,
    creditsPerMonth: 50,
    connectors: 0,
    priceMonthly: 0,
    tierDisplayName: 'VIBE Starter',
  },
  pro: {
    workspaces: 3,
    builders: 5,
    projects: 15,
    creditsPerMonth: 500,
    connectors: 5,
    priceMonthly: 4900,
    tierDisplayName: 'VIBE Pro',
  },
  growth: {
    workspaces: 5,
    builders: 15,
    projects: 50,
    creditsPerMonth: 1200,
    connectors: 15,
    priceMonthly: 9900,
    tierDisplayName: 'VIBE Growth',
  },
  team: {
    workspaces: 25,
    builders: 50,
    projects: -1,
    creditsPerMonth: 2500,
    connectors: -1,
    priceMonthly: 19900,
    tierDisplayName: 'VIBE Team',
  },
  portfolio: {
    workspaces: -1,
    builders: -1,
    projects: -1,
    creditsPerMonth: -1,
    connectors: -1,
    priceMonthly: 0,
    tierDisplayName: 'VIBE Portfolio',
  },
  enterprise: {
    workspaces: -1,
    builders: -1,
    projects: -1,
    creditsPerMonth: -1,
    connectors: -1,
    priceMonthly: 0,
    tierDisplayName: 'VIBE Enterprise',
  },
};

export function getTierLimits(slug: TierSlug): TierLimits {
  return TIER_LIMITS[slug];
}

export function checkLimit(
  current: number,
  max: number,
): { allowed: boolean; current: number; max: number } {
  if (max === -1) return { allowed: true, current, max };
  return { allowed: current < max, current, max };
}

/** Returns the next tier up from the given slug, or null if at top. */
export function getNextTier(slug: TierSlug): TierSlug | null {
  const order: TierSlug[] = ['starter', 'pro', 'growth', 'team', 'portfolio', 'enterprise'];
  const idx = order.indexOf(slug);
  if (idx === -1 || idx >= order.length - 1) return null;
  return order[idx + 1];
}

export const ALL_TIER_SLUGS: TierSlug[] = [
  'starter', 'pro', 'growth', 'team', 'portfolio', 'enterprise',
];
