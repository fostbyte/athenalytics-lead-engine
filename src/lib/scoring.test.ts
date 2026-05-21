import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateHeuristicScore, scoreLead } from './scoring';
import prisma from './prisma';

// 1. Mock Prisma default client
vi.mock('./prisma', () => ({
  default: {
    lead: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    searchJob: {
      update: vi.fn(),
    },
    settings: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    apiUsageLog: {
      create: vi.fn(),
    }
  }
}));

// 2. Mock ChatOpenAI from langchain to avoid actual OpenRouter API requests during test execution
vi.mock('@langchain/openai', () => {
  const mockInvoke = vi.fn().mockImplementation(async () => {
    return {
      text: JSON.stringify({
        score: 88,
        scoreBand: 'high',
        reasons: [
          'Excellent digital conversion maturity.',
          'Responsive and contact ready with direct communication paths.',
          'Solid established reputation profile.'
        ]
      }),
      content: JSON.stringify({
        score: 88,
        scoreBand: 'high',
        reasons: [
          'Excellent digital conversion maturity.',
          'Responsive and contact ready with direct communication paths.',
          'Solid established reputation profile.'
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

describe('calculateHeuristicScore', () => {
  it('correctly calculates high score lead with complete signals', () => {
    const mockLead = {
      id: 'lead-1',
      distanceMiles: 3,
    };
    const mockSignals = {
      hasWebsite: true,
      mobileFriendly: true,
      hasBooking: true,
      hasOrdering: true,
      contactReadiness: true,
      socialPresence: true,
      reviewCount: 120, // 25 points
    };

    const result = calculateHeuristicScore(mockLead, mockSignals);

    // Math check:
    // Category = 6 (fit weight 15 * 0.4 since category not provided)
    // Website + mobile = 25 (website weight 25)
    // Booking + ordering = 15 (demand weight 15)
    // Analytics pain = 6 (analytics weight 15 * 0.4 since standard CTAs are present)
    // Contact readiness = 15 (outreach weight 15)
    // Social + reviews = 10 (growth weight 10)
    // Distance = 5 (geo weight 5)
    // Total = 82
    expect(result.score).toBe(82);
    expect(result.scoreBand).toBe('high');
    expect(result.reasons.length).toBeGreaterThanOrEqual(3);
    expect(result.reasons.length).toBeLessThanOrEqual(5);
  });

  it('correctly categorizes low-scoring excluded lead', () => {
    const mockLead = {
      id: 'lead-2',
      distanceMiles: 40,
    };
    const mockSignals = {
      hasWebsite: false,
      hasBooking: false,
      hasOrdering: false,
      contactReadiness: false,
      socialPresence: false,
      reviewCount: 0,
    };

    const result = calculateHeuristicScore(mockLead, mockSignals);

    // Math:
    // Category = 6 (fit weight 15 * 0.4 since category not provided)
    // No website = 0
    // No booking/ordering = 0
    // Lacks web analytics = 15 (analytics weight 15)
    // No contact = 0
    // No social/reviews = 0
    // Distance > 15 = 2 (geo weight 5 * 0.4)
    // Total = 23
    expect(result.score).toBe(23);
    expect(result.scoreBand).toBe('review');
    expect(result.reasons.some(r => r.includes('No website detected'))).toBe(true);
  });

  it('handles null signals gracefully with default review score', () => {
    const mockLead = { id: 'lead-3' };
    const result = calculateHeuristicScore(mockLead, null);
    
    expect(result.score).toBe(10);
    expect(result.scoreBand).toBe('exclude');
    expect(result.reasons[0]).toContain('No digital footprint');
  });
});

describe('scoreLead LangGraph Pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.settings.findUnique as any).mockResolvedValue({
      workspaceId: 'workspace-test',
      senderName: 'Athenalytics Team',
      senderEmail: 'outreach@athenalytics.co',
      scoringWeights: {
        fit: 15,
        website: 25,
        demand: 15,
        analytics: 15,
        outreach: 15,
        growth: 10,
        geo: 5,
      },
      icpPresets: {
        requiredWebsite: false,
        minReviewCount: 0,
        requireBooking: false,
        requireOrdering: false,
        requireSocial: false,
      },
      promptTemplates: {
        direct: "Hi {{businessName}},\n\nI noticed your website lacks structured analytics or clear conversion pathways. We help businesses like yours fix this quickly.\n\nBest,\n{{senderName}}",
        friendly: "Hey there {{businessName}} team,\n\nHope you're having a great week! I was browsing local spots in {{city}} and came across your website. I love what you do! I noticed a few minor tweaks to your website's analytics could help you capture a lot more customers. We'd love to help out.\n\nWarmly,\n{{senderName}}",
        professional: "Dear {{businessName}} Management,\n\nI am writing to share a digital maturity audit of your online presence. Our team identified specific optimization opportunities regarding your analytics setup and contact readiness. We would be pleased to schedule a brief consultation to discuss these findings.\n\nSincerely,\n{{senderName}}",
      }
    });
  });

  it('successfully executes the LangGraph flow and saves results to DB', async () => {
    const mockLead = {
      id: 'lead-test',
      workspaceId: 'workspace-test',
      searchJobId: 'job-test',
      businessName: 'Acme Test Corp',
      category: 'General Testing',
      distanceMiles: 4,
      signals: {
        id: 'signals-test',
        hasWebsite: true,
        mobileFriendly: true,
        hasBooking: true,
        reviewCount: 45,
        contactReadiness: true,
      }
    };

    // Configure Prisma mocks
    (prisma.lead.findUnique as any).mockResolvedValue(mockLead);
    (prisma.lead.update as any).mockImplementation(async (args: any) => {
      return {
        ...mockLead,
        score: args.data.score,
        scoreBand: args.data.scoreBand,
        reasons: args.data.reasons,
        status: args.data.status,
      };
    });

    
    // Temporarily inject OpenRouter key to test the mock LLM pathway
    process.env.OPENROUTER_API_KEY = 'test-secret-key';

    const result = await scoreLead('lead-test');

    expect(result.success).toBe(true);
    
    // Checked by Mock ChatOpenAI returned values
    expect(result.score).toBe(88);
    expect(result.scoreBand).toBe('high');
    expect(result.reasons).toContain('Excellent digital conversion maturity.');

    // Verify Prisma updates were executed
    expect(prisma.lead.findUnique).toHaveBeenCalledWith({
      where: { id: 'lead-test' },
      include: { signals: true }
    });

    expect(prisma.lead.update).toHaveBeenCalledWith({
      where: { id: 'lead-test' },
      data: expect.objectContaining({
        score: 88,
        scoreBand: 'high',
        status: 'scored',
      })
    });

    expect(prisma.searchJob.update).toHaveBeenCalledWith({
      where: { id: 'job-test' },
      data: {
        totalScored: { increment: 1 }
      }
    });

    // Cleanup env
    delete process.env.OPENROUTER_API_KEY;
  });

  it('falls back seamlessly to local heuristic if OpenRouter key is missing', async () => {
    const mockLead = {
      id: 'lead-test-fallback',
      workspaceId: 'workspace-test',
      searchJobId: 'job-test',
      businessName: 'No Key Plumbing',
      distanceMiles: 2,
      signals: {
        hasWebsite: true,
        mobileFriendly: true,
        hasBooking: true,
        reviewCount: 15,
        contactReadiness: true,
      }
    };

    (prisma.lead.findUnique as any).mockResolvedValue(mockLead);
    (prisma.lead.update as any).mockImplementation(async (args: any) => {
      return {
        ...mockLead,
        score: args.data.score,
        scoreBand: args.data.scoreBand,
        reasons: args.data.reasons,
      };
    });

    // Ensure API key is strictly undefined
    delete process.env.OPENROUTER_API_KEY;

    const result = await scoreLead('lead-test-fallback');

    expect(result.success).toBe(true);
    
    // Heuristic math:
    // Category = 6 (fit weight 15 * 0.4 since category not provided)
    // Website + mobile = 25 (website weight 25)
    // Booking = 7.5 (demand weight 15 * 0.5)
    // Analytics = 15 (analytics weight 15 because it lacks ordering)
    // Contact = 15 (outreach weight 15)
    // 15 reviews = 5 (growth weight 10 * 0.5)
    // Distance = 5 (geo weight 5)
    // Total = 78.5 -> rounded to 79 (high match)
    expect(result.score).toBe(79);
    expect(result.scoreBand).toBe('high');
    expect(result.reasons).toContain('Website is optimized for mobile responsiveness.');

    expect(prisma.lead.update).toHaveBeenCalledWith({
      where: { id: 'lead-test-fallback' },
      data: expect.objectContaining({
        score: 79,
        scoreBand: 'high',
      })
    });
  });
});
