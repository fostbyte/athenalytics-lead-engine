import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processDiscoveryJob } from './worker';
import prisma from './prisma';

// Mock Prisma
vi.mock('./prisma', () => ({
  default: {
    searchJob: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    lead: {
      createMany: vi.fn(),
    }
  }
}));

describe('processDiscoveryJob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('processes a valid job to completion', async () => {
    const mockJob = {
      id: 'job-1',
      industry: 'plumbing',
      locationType: 'zip',
      zipCode: '78701',
      targetCount: 10,
    };
    
    (prisma.searchJob.findUnique as any).mockResolvedValue(mockJob);
    
    const result = await processDiscoveryJob('job-1');
    
    expect(result.success).toBe(true);
    expect(result.count).toBe(2); // 2 items in our MOCK_BUSINESSES for 78701
    
    expect(prisma.searchJob.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'processing' } })
    );
    
    expect(prisma.lead.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ businessName: 'Apex Plumbing' }),
          expect.objectContaining({ businessName: 'Texas Rooter' })
        ])
      })
    );
    
    expect(prisma.searchJob.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'completed', totalFound: 2 } })
    );
  });

  it('handles job not found', async () => {
    (prisma.searchJob.findUnique as any).mockResolvedValue(null);
    await expect(processDiscoveryJob('job-missing')).rejects.toThrow('Job not found');
  });

  it('handles geo validation errors gracefully', async () => {
    const mockJob = {
      id: 'job-2',
      industry: 'plumbing',
      locationType: 'zip',
      zipCode: 'invalid',
    };
    
    (prisma.searchJob.findUnique as any).mockResolvedValue(mockJob);
    
    const result = await processDiscoveryJob('job-2');
    
    expect(result.success).toBe(false);
    expect(prisma.searchJob.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'failed' }) })
    );
  });
});
