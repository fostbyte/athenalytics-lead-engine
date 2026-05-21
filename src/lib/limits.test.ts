import { describe, it, expect, beforeEach, vi } from 'vitest';
import prisma from './prisma';
import { 
  getTierLimits, 
  canPerformAction, 
  incrementUsage, 
  checkAndResetDailyQuotas 
} from './limits';

// Mock Prisma
vi.mock('./prisma', () => ({
  default: {
    settings: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    }
  }
}));

describe('SaaS Resource Limits Engine', () => {
  const testWorkspaceId = 'test-limits-workspace';
  
  const mockSettings = {
    id: 's-mock',
    workspaceId: testWorkspaceId,
    senderName: 'Test Limits Sender',
    senderEmail: 'limits@example.com',
    subscriptionTier: 'FREE',
    dailySearchesCount: 0,
    dailyResultsCount: 0,
    dailyDraftsCount: 0,
    lastResetDate: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('correctly maps tier limits configuration', () => {
    const freeLimits = getTierLimits('FREE');
    expect(freeLimits.searches).toBe(10);
    expect(freeLimits.results).toBe(50);
    expect(freeLimits.drafts).toBe(50);

    const tier1Limits = getTierLimits('TIER_1');
    expect(tier1Limits.searches).toBe(50);
    expect(tier1Limits.results).toBe(250);
    expect(tier1Limits.drafts).toBe(250);

    const unlimitedLimits = getTierLimits('UNLIMITED');
    expect(unlimitedLimits.searches).toBe(Infinity);
    expect(unlimitedLimits.results).toBe(Infinity);
    expect(unlimitedLimits.drafts).toBe(Infinity);
  });

  it('blocks actions when quota threshold is reached', async () => {
    // 1. Mock finding existing settings with 9 searches used out of 10
    const settingsWith9Searches = {
      ...mockSettings,
      dailySearchesCount: 9,
    };
    (prisma.settings.findUnique as any).mockResolvedValue(settingsWith9Searches);

    // 1 search remaining, should be allowed
    const quota1 = await canPerformAction(testWorkspaceId, 'searches', 1);
    expect(quota1.allowed).toBe(true);
    expect(quota1.remaining).toBe(1);

    // 2. Set daily searches to 10
    const settingsWith10Searches = {
      ...mockSettings,
      dailySearchesCount: 10,
    };
    (prisma.settings.findUnique as any).mockResolvedValue(settingsWith10Searches);

    // 0 searches remaining, further searches should be blocked
    const quota2 = await canPerformAction(testWorkspaceId, 'searches', 1);
    expect(quota2.allowed).toBe(false);
    expect(quota2.remaining).toBe(0);
  });

  it('gracefully resets daily counts when calendar day shifts', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // Mock settings that were last reset yesterday and have some counts
    const yesterdaySettings = {
      ...mockSettings,
      dailySearchesCount: 10,
      dailyResultsCount: 50,
      dailyDraftsCount: 50,
      lastResetDate: yesterday,
    };
    (prisma.settings.findUnique as any).mockResolvedValue(yesterdaySettings);

    const resetSettings = {
      ...yesterdaySettings,
      dailySearchesCount: 0,
      dailyResultsCount: 0,
      dailyDraftsCount: 0,
      lastResetDate: new Date(),
    };
    (prisma.settings.update as any).mockResolvedValue(resetSettings);

    // Verify reset resets counters on trigger check
    const refreshed = await checkAndResetDailyQuotas(testWorkspaceId);
    expect(refreshed.dailySearchesCount).toBe(0);
    expect(refreshed.dailyResultsCount).toBe(0);
    expect(refreshed.dailyDraftsCount).toBe(0);
    expect(prisma.settings.update).toHaveBeenCalledWith({
      where: { workspaceId: testWorkspaceId },
      data: expect.objectContaining({
        dailySearchesCount: 0,
        dailyResultsCount: 0,
        dailyDraftsCount: 0,
      }),
    });
  });

  it('exempts unlimited tiers from quota blocking rules', async () => {
    const unlimitedSettings = {
      ...mockSettings,
      subscriptionTier: 'UNLIMITED',
      dailyDraftsCount: 9999,
    };
    (prisma.settings.findUnique as any).mockResolvedValue(unlimitedSettings);

    const quota = await canPerformAction(testWorkspaceId, 'drafts', 1);
    expect(quota.allowed).toBe(true);
    expect(quota.remaining).toBe(Infinity);
  });
});
