import { describe, it, expect, vi, beforeEach } from 'vitest';
import { enrichLead, processEnrichmentForJob } from './enrichment';
import prisma from './prisma';

// Mock Prisma
vi.mock('./prisma', () => ({
  default: {
    lead: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    leadSignals: {
      upsert: vi.fn(),
    },
    searchJob: {
      update: vi.fn(),
    }
  }
}));

describe('enrichLead', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates signals and upserts them for a valid lead', async () => {
    const mockLead = {
      id: 'lead-1',
      workspaceId: 'ws-1',
      searchJobId: 'job-1',
      businessName: 'Apex Plumbing',
      website: 'https://apex.example.com',
    };
    
    (prisma.lead.findUnique as any).mockResolvedValue(mockLead);
    (prisma.leadSignals.upsert as any).mockImplementation(async (args: any) => ({
      id: 'signal-1',
      ...args.create
    }));
    
    const result = await enrichLead('lead-1');
    
    expect(result.success).toBe(true);
    expect(result.signals).toBeDefined();
    
    // Website is provided in the mock, so hasWebsite must be true
    expect(result.signals.hasWebsite).toBe(true);
    expect(result.signals.workspaceId).toBe('ws-1');
    
    expect(prisma.leadSignals.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { leadId: 'lead-1' },
      })
    );
    
    expect(prisma.searchJob.update).toHaveBeenCalledWith({
      where: { id: 'job-1' },
      data: { totalEnriched: { increment: 1 } },
    });
  });

  it('throws an error if lead is not found', async () => {
    (prisma.lead.findUnique as any).mockResolvedValue(null);
    await expect(enrichLead('missing-lead')).rejects.toThrow('Lead not found');
  });
});

describe('processEnrichmentForJob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('processes multiple leads for a job', async () => {
    const mockLeads = [
      { id: 'lead-1', workspaceId: 'ws-1', searchJobId: 'job-1', website: 'x.com' },
      { id: 'lead-2', workspaceId: 'ws-1', searchJobId: 'job-1', website: 'y.com' },
    ];
    
    (prisma.lead.findMany as any).mockResolvedValue(mockLeads);
    (prisma.lead.findUnique as any).mockImplementation(async (args: any) => 
      mockLeads.find(l => l.id === args.where.id)
    );
    (prisma.leadSignals.upsert as any).mockResolvedValue({});
    
    const result = await processEnrichmentForJob('job-1');
    
    expect(result.success).toBe(true);
    expect(result.count).toBe(2);
    expect(prisma.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { searchJobId: 'job-1', signals: null },
      })
    );
    expect(prisma.leadSignals.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.searchJob.update).toHaveBeenCalledTimes(2);
  });
});
