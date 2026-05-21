import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateNextRun, executeScheduledSearchJob, triggerScheduledSearches } from './scheduler';
import prisma from './prisma';
import { processDiscoveryJob } from './worker';
import { processEnrichmentForJob } from './enrichment';
import { scoreLead } from './scoring';
import { canPerformAction, incrementUsage } from './limits';

// Mock Prisma
vi.mock('./prisma', () => ({
  default: {
    scheduledSearch: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    searchJob: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
    lead: {
      findMany: vi.fn(),
    },
  },
}));

// Mock worker, enrichment, scoring, limits
vi.mock('./worker', () => ({
  processDiscoveryJob: vi.fn(),
}));

vi.mock('./enrichment', () => ({
  processEnrichmentForJob: vi.fn(),
}));

vi.mock('./scoring', () => ({
  scoreLead: vi.fn(),
}));

vi.mock('./limits', () => ({
  canPerformAction: vi.fn(),
  incrementUsage: vi.fn(),
}));

describe('Scheduler Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateNextRun', () => {
    it('calculates daily interval correctly', () => {
      const base = new Date('2026-05-21T12:00:00.000Z');
      const next = calculateNextRun('daily', base);
      expect(next.toISOString()).toBe('2026-05-22T12:00:00.000Z');
    });

    it('calculates weekly interval correctly', () => {
      const base = new Date('2026-05-21T12:00:00.000Z');
      const next = calculateNextRun('weekly', base);
      expect(next.toISOString()).toBe('2026-05-28T12:00:00.000Z');
    });

    it('calculates monthly interval correctly', () => {
      const base = new Date('2026-05-21T12:00:00.000Z');
      const next = calculateNextRun('monthly', base);
      expect(next.toISOString()).toBe('2026-06-21T12:00:00.000Z');
    });
  });

  describe('executeScheduledSearchJob', () => {
    it('runs discovery, enrichment, scoring and notifies success', async () => {
      (processDiscoveryJob as any).mockResolvedValue({ success: true, count: 5 });
      (processEnrichmentForJob as any).mockResolvedValue({ success: true });
      (prisma.lead.findMany as any).mockResolvedValue([
        { id: 'lead-1', businessName: 'Biz 1' },
        { id: 'lead-2', businessName: 'Biz 2' },
      ]);
      (prisma.searchJob.findUnique as any).mockResolvedValue({
        id: 'job-1',
        workspaceId: 'workspace-1',
        vertical: 'Roofers',
        locationType: 'zip',
        zipCode: '78701',
      });

      await executeScheduledSearchJob('job-1');

      expect(processDiscoveryJob).toHaveBeenCalledWith('job-1');
      expect(processEnrichmentForJob).toHaveBeenCalledWith('job-1');
      expect(scoreLead).toHaveBeenCalledWith('lead-1');
      expect(scoreLead).toHaveBeenCalledWith('lead-2');
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            workspaceId: 'workspace-1',
            title: 'Automated Lead Alert 🎯',
            type: 'new_leads',
          }),
        })
      );
    });

    it('creates info notification if no leads are found', async () => {
      (processDiscoveryJob as any).mockResolvedValue({ success: true, count: 0 });
      (processEnrichmentForJob as any).mockResolvedValue({ success: true });
      (prisma.lead.findMany as any).mockResolvedValue([]);
      (prisma.searchJob.findUnique as any).mockResolvedValue({
        id: 'job-1',
        workspaceId: 'workspace-1',
        vertical: 'Roofers',
        locationType: 'zip',
        zipCode: '78701',
      });

      await executeScheduledSearchJob('job-1');

      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            workspaceId: 'workspace-1',
            title: 'Automated Scan Complete 🔍',
            type: 'info',
          }),
        })
      );
    });

    it('logs warning notification and fails job on discovery failure', async () => {
      (processDiscoveryJob as any).mockResolvedValue({ success: false, error: 'Discovery rate limit' });
      (prisma.searchJob.findUnique as any).mockResolvedValue({
        id: 'job-1',
        workspaceId: 'workspace-1',
        vertical: 'Roofers',
        locationType: 'zip',
        zipCode: '78701',
      });

      await executeScheduledSearchJob('job-1');

      expect(prisma.searchJob.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'job-1' },
          data: { status: 'failed', error: 'Discovery rate limit' },
        })
      );
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            workspaceId: 'workspace-1',
            title: 'Automated Scan Failed ⚠️',
            type: 'warning',
          }),
        })
      );
    });
  });

  describe('triggerScheduledSearches', () => {
    it('skips scheduled search if searches quota is exceeded', async () => {
      const mockSchedule = {
        id: 'sched-1',
        workspaceId: 'workspace-1',
        vertical: 'Dentists',
        locationType: 'zip',
        zipCode: '78701',
        radiusMiles: 10,
        targetCount: 10,
        interval: 'weekly',
      };
      (prisma.scheduledSearch.findMany as any).mockResolvedValue([mockSchedule]);
      (canPerformAction as any).mockResolvedValue({ allowed: false });

      const result = await triggerScheduledSearches();

      expect(result.triggeredCount).toBe(0);
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            workspaceId: 'workspace-1',
            title: 'Schedules Paused (Quota Exceeded) ⚠️',
            type: 'warning',
          }),
        })
      );
      expect(prisma.scheduledSearch.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sched-1' },
          data: expect.objectContaining({
            nextRunAt: expect.any(Date),
          }),
        })
      );
    });

    it('triggers scheduled search and queues job when quota is allowed', async () => {
      const mockSchedule = {
        id: 'sched-2',
        workspaceId: 'workspace-2',
        vertical: 'Locksmiths',
        locationType: 'city_state',
        city: 'Austin',
        state: 'TX',
        radiusMiles: 15,
        targetCount: 30,
        interval: 'daily',
      };
      (prisma.scheduledSearch.findMany as any).mockResolvedValue([mockSchedule]);
      (canPerformAction as any).mockResolvedValue({ allowed: true });
      (prisma.searchJob.create as any).mockResolvedValue({ id: 'job-2' });

      const result = await triggerScheduledSearches();

      expect(result.triggeredCount).toBe(1);
      expect(result.jobs).toContain('job-2');
      expect(prisma.searchJob.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            workspaceId: 'workspace-2',
            vertical: 'Locksmiths',
            status: 'queued',
            scheduledSearchId: 'sched-2',
          }),
        })
      );
      expect(incrementUsage).toHaveBeenCalledWith('workspace-2', 'searches');
      expect(prisma.scheduledSearch.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sched-2' },
          data: expect.objectContaining({
            lastRunAt: expect.any(Date),
            nextRunAt: expect.any(Date),
          }),
        })
      );
    });
  });
});
