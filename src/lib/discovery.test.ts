import { describe, it, expect } from 'vitest';
import { discoverLeads } from './discovery';

describe('discoverLeads', () => {
  it('returns leads filtered by ZIP code', async () => {
    const leads = await discoverLeads({
      industry: 'plumbing',
      zipCode: '78701',
      targetCount: 10
    });
    
    expect(leads.length).toBe(2);
    expect(leads[0].businessName).toBe('Apex Plumbing');
  });

  it('respects target count limits', async () => {
    const leads = await discoverLeads({
      industry: 'plumbing',
      zipCode: '78701',
      targetCount: 1
    });
    
    expect(leads.length).toBe(1);
  });

  it('returns leads filtered by city/state', async () => {
    const leads = await discoverLeads({
      industry: 'plumbing',
      city: 'Austin',
      state: 'TX',
      targetCount: 10
    });
    
    // There are 3 total Austin businesses across ZIPs
    expect(leads.length).toBe(3);
  });

  it('generates mock leads dynamically if no static match is found', async () => {
    const leads = await discoverLeads({
      industry: 'plumbing',
      zipCode: '99999',
      targetCount: 10
    });
    
    expect(leads.length).toBeGreaterThan(0);
    expect(leads[0].businessName).toContain('Plumbing');
  });
});
