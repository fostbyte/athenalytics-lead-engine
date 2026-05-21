import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkAndLogQuota } from './places';
import prisma from './prisma';

const originalEnv = process.env;

vi.mock('./prisma', () => ({
  default: {
    apiUsageLog: {
      aggregate: vi.fn(),
      create: vi.fn(),
    }
  }
}));

describe('checkAndLogQuota', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  it('bypasses check if GOOGLE_PLACES_API_KEY is not configured', async () => {
    delete process.env.GOOGLE_PLACES_API_KEY;
    delete process.env.GOOGLE_MAPS_API_KEY;

    await expect(checkAndLogQuota('places')).resolves.not.toThrow();
    expect(prisma.apiUsageLog.aggregate).not.toHaveBeenCalled();
    expect(prisma.apiUsageLog.create).not.toHaveBeenCalled();
  });

  it('allows request and logs cost if monthly spend is within limit', async () => {
    process.env.GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || 'mock-google-places-key';
    
    // Monthly spend is $50.00
    (prisma.apiUsageLog.aggregate as any).mockResolvedValue({
      _sum: { cost: 50.00 }
    });
    (prisma.apiUsageLog.create as any).mockResolvedValue({});

    await expect(checkAndLogQuota('places')).resolves.not.toThrow();

    expect(prisma.apiUsageLog.aggregate).toHaveBeenCalled();
    expect(prisma.apiUsageLog.create).toHaveBeenCalledWith({
      data: {
        apiName: 'places',
        cost: 0.032
      }
    });
  });

  it('allows geocoding call if spend is within limit', async () => {
    process.env.GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || 'mock-google-places-key';
    
    // Monthly spend is $10.00
    (prisma.apiUsageLog.aggregate as any).mockResolvedValue({
      _sum: { cost: 10.00 }
    });
    (prisma.apiUsageLog.create as any).mockResolvedValue({});

    await expect(checkAndLogQuota('geocoding')).resolves.not.toThrow();

    expect(prisma.apiUsageLog.aggregate).toHaveBeenCalled();
    expect(prisma.apiUsageLog.create).toHaveBeenCalledWith({
      data: {
        apiName: 'geocoding',
        cost: 0.005
      }
    });
  });

  it('blocks request and throws budget limit exception if monthly spend exceeds 70% ($140.00)', async () => {
    process.env.GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || 'mock-google-places-key';
    
    // Monthly spend is $139.98
    (prisma.apiUsageLog.aggregate as any).mockResolvedValue({
      _sum: { cost: 139.98 }
    });

    // An addition of places call ($0.032) would make it $140.012 which exceeds $140.00
    await expect(checkAndLogQuota('places')).rejects.toThrow(
      'Google Maps API monthly rate limit exceeded. Monthly safety limit of $140.00 (70% of free tier) reached. API call blocked to prevent billing charges.'
    );

    expect(prisma.apiUsageLog.aggregate).toHaveBeenCalled();
    expect(prisma.apiUsageLog.create).not.toHaveBeenCalled();
  });
});
