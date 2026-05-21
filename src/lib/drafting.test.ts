import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateLocalFallbackDraft, draftEmail } from './drafting';
import prisma from './prisma';

// 1. Mock Prisma client
vi.mock('./prisma', () => ({
  default: {
    lead: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    emailDraft: {
      create: vi.fn(),
      update: vi.fn(),
    }
  }
}));

// 2. Mock ChatOpenAI from langchain
vi.mock('@langchain/openai', () => {
  const mockInvoke = vi.fn().mockImplementation(async () => {
    return {
      text: JSON.stringify({
        subject: 'Custom AI Subject Line',
        body: 'Custom AI body text focusing on missing booking features. Athenalytics Team',
        personalizationPoints: [
          'Observed missing booking',
          'Potential loss of local traffic',
          'Athenalytics recoveries',
          '5-minute call Tuesday'
        ]
      }),
      content: JSON.stringify({
        subject: 'Custom AI Subject Line',
        body: 'Custom AI body text focusing on missing booking features. Athenalytics Team',
        personalizationPoints: [
          'Observed missing booking',
          'Potential loss of local traffic',
          'Athenalytics recoveries',
          '5-minute call Tuesday'
        ]
      })
    };
  });

  return {
    ChatOpenAI: class {
      invoke = mockInvoke;
    }
  };
});

describe('generateLocalFallbackDraft', () => {
  const mockLead = {
    id: 'lead-1',
    businessName: 'Apex Roofing Co',
    city: 'Austin'
  };

  it('generates friendly draft for lead without website', () => {
    const signals = { hasWebsite: false };
    const draft = generateLocalFallbackDraft(mockLead, signals, 'friendly');

    expect(draft.subject).toContain('Apex Roofing Co 😊');
    expect(draft.body).toContain("doesn't have an active website yet");
    expect(draft.body).toContain('Best regards,\nAthenalytics Team');
    expect(draft.personalizationPoints?.[0]).toContain("doesn't have an active website");
  });

  it('generates direct draft for lead lacking booking', () => {
    const signals = { hasWebsite: true, hasBooking: false };
    const draft = generateLocalFallbackDraft(mockLead, signals, 'direct');

    expect(draft.subject).toContain('Outreach: Digital upgrades');
    expect(draft.body).toContain("aren't able to book appointments");
    expect(draft.body).toContain('Do you have 5 minutes');
    expect(draft.body).toContain('Thanks,\nAthenalytics Team');
  });

  it('generates professional draft for lead with mobile friendly issues', () => {
    const signals = { hasWebsite: true, hasBooking: true, mobileFriendly: false };
    const draft = generateLocalFallbackDraft(mockLead, signals, 'professional');

    expect(draft.subject).toContain('Strategic growth');
    expect(draft.body).toContain("isn't fully optimized for mobile devices");
    expect(draft.body).toContain('Dear Sir or Madam');
    expect(draft.body).toContain('Sincerely,\nAthenalytics Team');
  });
});

describe('draftEmail service orchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runs OpenRouter pipeline if API key is present', async () => {
    const mockLead = {
      id: 'lead-test',
      workspaceId: 'workspace-test',
      businessName: 'Apex Painters',
      signals: {
        hasWebsite: true,
        hasBooking: false,
      }
    };

    (prisma.lead.findUnique as any).mockResolvedValue(mockLead);
    (prisma.emailDraft.create as any).mockImplementation(async (args: any) => {
      return {
        id: 'draft-test',
        ...args.data
      };
    });

    // Inject env key
    process.env.OPENROUTER_API_KEY = 'test-key';

    const result = await draftEmail('lead-test', 'friendly');

    expect(result.subject).toBe('Custom AI Subject Line');
    expect(result.body).toContain('Custom AI body text');
    expect(result.personalizationPoints?.[0]).toBe('Observed missing booking');

    // Verify DB update triggers
    expect(prisma.emailDraft.create).toHaveBeenCalledWith({
      data: {
        workspaceId: 'workspace-test',
        leadId: 'lead-test',
        subject: 'Custom AI Subject Line',
        body: 'Custom AI body text focusing on missing booking features. Athenalytics Team',
        status: 'pending'
      }
    });

    expect(prisma.lead.update).toHaveBeenCalledWith({
      where: { id: 'lead-test' },
      data: { status: 'drafted' }
    });

    delete process.env.OPENROUTER_API_KEY;
  });

  it('falls back seamlessly to local heuristic template if OpenRouter key is missing', async () => {
    const mockLead = {
      id: 'lead-test-fallback',
      workspaceId: 'workspace-test',
      businessName: 'Apex Plumbers',
      signals: {
        hasWebsite: true,
        hasBooking: false,
      }
    };

    (prisma.lead.findUnique as any).mockResolvedValue(mockLead);
    (prisma.emailDraft.create as any).mockImplementation(async (args: any) => {
      return {
        id: 'draft-test-fallback',
        ...args.data
      };
    });

    // Ensure key is strictly missing
    delete process.env.OPENROUTER_API_KEY;

    const result = await draftEmail('lead-test-fallback', 'direct');

    expect(result.subject).toContain('Outreach: Digital upgrades');
    expect(result.body).toContain("aren't able to book appointments");

    // Verify DB update triggers
    expect(prisma.emailDraft.create).toHaveBeenCalledWith({
      data: {
        workspaceId: 'workspace-test',
        leadId: 'lead-test-fallback',
        subject: expect.stringContaining('Outreach: Digital upgrades'),
        body: expect.stringContaining("aren't able to book appointments"),
        status: 'pending'
      }
    });

    expect(prisma.lead.update).toHaveBeenCalledWith({
      where: { id: 'lead-test-fallback' },
      data: { status: 'drafted' }
    });
  });
});
