import { describe, it, expect } from 'vitest';
import { normalizeGeography, calculateDistanceMiles } from './geo';

describe('normalizeGeography', () => {
  it('validates a known ZIP code and returns lat/lng', async () => {
    const res = await normalizeGeography({ locationType: 'zip', zipCode: '78701' });
    expect(res.isValid).toBe(true);
    expect(res.city).toBe('Austin');
    expect(res.state).toBe('TX');
    expect(res.lat).toBe(30.2711);
  });

  it('rejects invalid ZIP code', async () => {
    const res = await normalizeGeography({ locationType: 'zip', zipCode: '123' });
    expect(res.isValid).toBe(false);
    expect(res.errors).toContain('Invalid or missing 5-digit zipCode');
  });

  it('normalizes valid city and state casing', async () => {
    const res = await normalizeGeography({ locationType: 'city_state', city: ' austin ', state: ' tx ' });
    expect(res.isValid).toBe(true);
    expect(res.city).toBe('Austin');
    expect(res.state).toBe('TX');
  });

  it('rejects missing city/state', async () => {
    const res = await normalizeGeography({ locationType: 'city_state', city: 'Austin' });
    expect(res.isValid).toBe(false);
    expect(res.errors).toContain('City and state are required');
  });
});

describe('calculateDistanceMiles', () => {
  it('calculates rough distance between two coordinates', () => {
    // Austin (30.2711, -97.7437) to New York (40.7501, -73.9996)
    // Distance should be ~1500-1600 miles
    const dist = calculateDistanceMiles(30.2711, -97.7437, 40.7501, -73.9996);
    expect(dist).toBeGreaterThan(1500);
    expect(dist).toBeLessThan(1600);
  });
});
