import { describe, it, expect } from 'vitest';
import { generateLocalFallbackDraft } from './drafting';

describe('Settings and Custom Template Interpolation', () => {
  const mockLead = {
    id: 'lead-test',
    businessName: 'Super Dentists',
    city: 'Orlando',
    state: 'FL',
    category: 'Dental Clinic',
  };

  const mockSignals = {
    hasWebsite: true,
    mobileFriendly: false,
    hasBooking: false,
  };

  it('interpolates template variables correctly when settings promptTemplates are provided', () => {
    const mockSettings = {
      senderName: 'Dr. Jane Smith',
      promptTemplates: {
        direct: "Hi {{businessName}},\n\nWe love Orlando local businesses. I noticed {{businessName}} in {{city}} is outstanding, but your site lacks booking tools.\n\nBest,\n{{senderName}}",
        friendly: "Hey there {{businessName}} team,\n\nI was checking out {{category}} sites in {{city}}.\n\nWarmly,\n{{senderName}}",
        professional: "Dear {{businessName}} Management,\n\nOur audit of your {{category}} in {{city}}, {{state}} reveals opportunities.\n\nSincerely,\n{{senderName}}",
      }
    };

    // 1. Direct tone test
    const directResult = generateLocalFallbackDraft(mockLead, mockSignals, 'direct', mockSettings);
    expect(directResult.body).toBe(
      "Hi Super Dentists,\n\nWe love Orlando local businesses. I noticed Super Dentists in Orlando is outstanding, but your site lacks booking tools.\n\nBest,\nDr. Jane Smith"
    );
    expect(directResult.subject).toBe("Outreach: Digital upgrades for Super Dentists");

    // 2. Friendly tone test
    const friendlyResult = generateLocalFallbackDraft(mockLead, mockSignals, 'friendly', mockSettings);
    expect(friendlyResult.body).toBe(
      "Hey there Super Dentists team,\n\nI was checking out Dental Clinic sites in Orlando.\n\nWarmly,\nDr. Jane Smith"
    );
    expect(friendlyResult.subject).toBe("Quick question about Super Dentists 😊");

    // 3. Professional tone test
    const professionalResult = generateLocalFallbackDraft(mockLead, mockSignals, 'professional', mockSettings);
    expect(professionalResult.body).toBe(
      "Dear Super Dentists Management,\n\nOur audit of your Dental Clinic in Orlando, FL reveals opportunities.\n\nSincerely,\nDr. Jane Smith"
    );
    expect(professionalResult.subject).toBe("Strategic growth and optimization - Super Dentists");
  });

  it('replaces missing double brace variables with empty strings or defaults gracefully', () => {
    const sparseLead = {
      id: 'sparse-1',
      businessName: null,
      city: undefined,
    };

    const mockSettings = {
      senderName: '',
      promptTemplates: {
        direct: "Hello {{businessName}} under {{city}} from {{senderName}}.",
      }
    };

    const result = generateLocalFallbackDraft(sparseLead, mockSignals, 'direct', mockSettings);
    expect(result.body).toBe("Hello there under your area from Athenalytics Team.");
  });
});
