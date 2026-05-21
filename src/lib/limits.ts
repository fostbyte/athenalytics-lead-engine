import prisma from './prisma';
import { getWorkspaceSettings } from './tenant';

export interface QuotaLimits {
  searches: number;
  results: number;
  drafts: number;
}

export const TIER_LIMITS: Record<string, QuotaLimits> = {
  FREE: {
    searches: 10,
    results: 50,
    drafts: 50,
  },
  TIER_1: {
    searches: 50,
    results: 250,
    drafts: 250,
  },
  TIER_2: {
    searches: 200,
    results: 1000,
    drafts: 1000,
  },
  UNLIMITED: {
    searches: Infinity,
    results: Infinity,
    drafts: Infinity,
  },
};

/**
 * Returns the limits configuration mapping for a given tier.
 */
export function getTierLimits(tier: string): QuotaLimits {
  const normalized = (tier || 'FREE').toUpperCase();
  return TIER_LIMITS[normalized] || TIER_LIMITS.FREE;
}

/**
 * Checks if the calendar day has changed since the last reset.
 * If yes, zeroes all quota counters in the database and updates lastResetDate to today.
 */
export async function checkAndResetDailyQuotas(workspaceId: string) {
  const settings = await getWorkspaceSettings(workspaceId);
  
  const lastReset = new Date(settings.lastResetDate);
  const now = new Date();
  
  if (lastReset.toDateString() !== now.toDateString()) {
    return await prisma.settings.update({
      where: { workspaceId },
      data: {
        dailySearchesCount: 0,
        dailyResultsCount: 0,
        dailyDraftsCount: 0,
        lastResetDate: now,
      },
    });
  }
  
  return settings;
}

/**
 * Evaluates whether a workspace can perform a specific resource action.
 * Returns an object containing availability, current usages, and remaining allowances.
 */
export async function canPerformAction(
  workspaceId: string,
  metric: 'searches' | 'results' | 'drafts',
  requested = 1
) {
  // Ensure daily limits are fresh and reset if calendar day rolled over
  const settings = await checkAndResetDailyQuotas(workspaceId);
  const limits = getTierLimits(settings.subscriptionTier);
  
  let current = 0;
  let limit = 0;
  
  if (metric === 'searches') {
    current = settings.dailySearchesCount;
    limit = limits.searches;
  } else if (metric === 'results') {
    current = settings.dailyResultsCount;
    limit = limits.results;
  } else if (metric === 'drafts') {
    current = settings.dailyDraftsCount;
    limit = limits.drafts;
  }
  
  const allowed = current + requested <= limit;
  const remaining = limit === Infinity ? Infinity : Math.max(0, limit - current);
  
  return {
    allowed,
    remaining,
    limit,
    current,
  };
}

/**
 * Increments the daily usage counters for the given resource metric.
 */
export async function incrementUsage(
  workspaceId: string,
  metric: 'searches' | 'results' | 'drafts',
  amount = 1
) {
  // Always check resets first before incrementing
  await checkAndResetDailyQuotas(workspaceId);
  
  const fieldMap = {
    searches: 'dailySearchesCount',
    results: 'dailyResultsCount',
    drafts: 'dailyDraftsCount',
  };
  
  const dbField = fieldMap[metric];
  
  return await prisma.settings.update({
    where: { workspaceId },
    data: {
      [dbField]: {
        increment: amount,
      },
    },
  });
}
