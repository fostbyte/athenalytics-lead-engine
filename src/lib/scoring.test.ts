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
    // Website + mobile = 10
    // Booking + ordering = 20
    // Contact + social = 20
    // Reviews = 25
    // Distance = 10
    // Total = 85
    expect(result.score).toBe(85);
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
    // No website (0)
    // No booking/ordering (0)
    // No contact/social (0)
    // 0 reviews = 5 points
    // Distance > 15 = 4 points
    // Total = 9 points
    expect(result.score).toBe(9);
    expect(result.scoreBand).toBe('exclude');
    expect(result.reasons[0]).toContain('No website detected');
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
    // Website + mobile = 10
    // Booking = 10
    // Contact = 10
    // 15 reviews = 15
    // Distance = 10
    // Total = 55 (medium match)
    expect(result.score).toBe(55);
    expect(result.scoreBand).toBe('medium');
    expect(result.reasons).toContain('Website is optimized for mobile responsiveness.');

    expect(prisma.lead.update).toHaveBeenCalledWith({
      where: { id: 'lead-test-fallback' },
      data: expect.objectContaining({
        score: 55,
        scoreBand: 'medium',
      })
    });
  });
});
