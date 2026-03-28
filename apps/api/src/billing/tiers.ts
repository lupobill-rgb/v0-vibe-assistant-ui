export type TierSlug = 'starter' | 'pro' | 'growth' | 'team' | 'enterprise';

export interface TierLimits {
  workspaces: number;
  builders: number;
  projects: number;   // -1 = unlimited
  creditsPerMonth: number; // -1 = unlimited
  connectors: number; // -1 = unlimited
  priceMonthly: number;   // cents (USD)
  tierDisplayName: string;
}

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
  const order: TierSlug[] = ['starter', 'pro', 'growth', 'team', 'enterprise'];
  const idx = order.indexOf(slug);
  if (idx === -1 || idx >= order.length - 1) return null;
  return order[idx + 1];
}

export const ALL_TIER_SLUGS: TierSlug[] = ['starter', 'pro', 'growth', 'team', 'enterprise'];
