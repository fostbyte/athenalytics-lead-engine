import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  getWorkspaceIdFromRequest, 
  getWorkspaceSettings, 
  validateScoringWeights, 
  verifyWorkspaceAccess,
  DEFAULT_WORKSPACE_ID,
  DEFAULT_SCORING_WEIGHTS
} from './tenant';
import prisma from './prisma';

// Mock Prisma
vi.mock('./prisma', () => ({
  default: {
    settings: {
      findUnique: vi.fn(),
      create: vi.fn(),
    }
  }
}));

describe('getWorkspaceIdFromRequest', () => {
  it('returns default workspace ID if no request is provided', () => {
    const wsId = getWorkspaceIdFromRequest(null);
    expect(wsId).toBe(DEFAULT_WORKSPACE_ID);
  });

  it('extracts workspace ID from x-workspace-id header', () => {
    const req = new Request('https://localhost/api/leads', {
      headers: {
        'x-workspace-id': 'workspace-header-123'
      }
    });
    const wsId = getWorkspaceIdFromRequest(req);
    expect(wsId).toBe('workspace-header-123');
  });

  it('extracts workspace ID from query parameter', () => {
    const req = new Request('https://localhost/api/leads?workspaceId=workspace-query-456');
    const wsId = getWorkspaceIdFromRequest(req);
    expect(wsId).toBe('workspace-query-456');
  });

  it('prefers headers over query parameters', () => {
    const req = new Request('https://localhost/api/leads?workspaceId=workspace-query-456', {
      headers: {
        'x-workspace-id': 'workspace-header-123'
      }
    });
    const wsId = getWorkspaceIdFromRequest(req);
    expect(wsId).toBe('workspace-header-123');
  });
});

describe('getWorkspaceSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns existing settings if found', async () => {
    const mockSettings = { id: 's1', workspaceId: 'w1', senderName: 'Alice Outreach' };
    (prisma.settings.findUnique as any).mockResolvedValue(mockSettings);

    const result = await getWorkspaceSettings('w1');
    expect(result).toEqual(mockSettings);
    expect(prisma.settings.findUnique).toHaveBeenCalledWith({
      where: { workspaceId: 'w1' }
    });
    expect(prisma.settings.create).not.toHaveBeenCalled();
  });

  it('seeds defaults and returns new settings if not found', async () => {
    (prisma.settings.findUnique as any).mockResolvedValue(null);
    const seededSettings = { id: 's-new', workspaceId: 'w2', senderName: 'Athenalytics Team' };
    (prisma.settings.create as any).mockResolvedValue(seededSettings);

    const result = await getWorkspaceSettings('w2');
    expect(result).toEqual(seededSettings);
    expect(prisma.settings.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        workspaceId: 'w2',
        senderName: 'Athenalytics Team'
      })
    });
  });
});

describe('validateScoringWeights', () => {
  it('validates weights that sum to exactly 100%', () => {
    const valid = validateScoringWeights(DEFAULT_SCORING_WEIGHTS);
    expect(valid).toBe(true);
  });

  it('fails weights that sum to more or less than 100%', () => {
    const invalidWeights = {
      ...DEFAULT_SCORING_WEIGHTS,
      fit: 50 // Sum is now > 100
    };
    const valid = validateScoringWeights(invalidWeights);
    expect(valid).toBe(false);
  });
});

describe('verifyWorkspaceAccess', () => {
  it('returns true if workspace IDs match', () => {
    const result = verifyWorkspaceAccess('workspace-1', 'workspace-1');
    expect(result).toBe(true);
  });

  it('throws an error if workspace IDs do not match (leak protection)', () => {
    expect(() => {
      verifyWorkspaceAccess('workspace-1', 'workspace-2');
    }).toThrow('Access denied: Cross-workspace resource leakage blocked');
  });
});
