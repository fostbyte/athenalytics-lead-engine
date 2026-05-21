import { searchPlaces, type PlaceResult } from './places';

export interface LeadCandidate {
  businessName: string;
  website: string | null;
  phoneNumber: string | null;
  address: string | null;
  city?: string;
  state?: string;
  zipCode?: string;
  lat?: number;
  lng?: number;
  placeId?: string;
  category?: string;
  rating?: number;
  reviewCount?: number;
  source: string;
}

export interface DiscoveryOptions {
  industry: string;
  city?: string;
  state?: string;
  zipCode?: string;
  lat?: number;
  lng?: number;
  radiusMiles?: number;
  targetCount: number;
}

// ─── Static Mock Pool (fallback when API key not configured) ──────────────────

const MOCK_BUSINESSES = [
  { businessName: 'Apex Plumbing', website: 'apexplumbing.test', phoneNumber: '555-0101', address: '101 Main St, Austin, TX', city: 'Austin', state: 'TX', zipCode: '78701', lat: 30.2711, lng: -97.7437, category: 'Plumbing' },
  { businessName: 'Texas Rooter', website: null, phoneNumber: '555-0102', address: '202 Oak St, Austin, TX', city: 'Austin', state: 'TX', zipCode: '78701', lat: 30.2720, lng: -97.7445, category: 'Plumbing' },
  { businessName: 'Capital Pipes', website: 'capitalpipes.test', phoneNumber: '555-0103', address: '303 Pine St, Austin, TX', city: 'Austin', state: 'TX', zipCode: '78702', lat: 30.2695, lng: -97.7320, category: 'Plumbing' },
  { businessName: 'NY Drain Clears', website: 'nydrain.test', phoneNumber: '555-0201', address: '404 Broadway, New York, NY', city: 'New York', state: 'NY', zipCode: '10001', lat: 40.7505, lng: -73.9985, category: 'Plumbing' },
  { businessName: 'Beverly Hills Plumbing', website: 'bhplumb.test', phoneNumber: '555-0301', address: '505 Rodeo Dr, Beverly Hills, CA', city: 'Beverly Hills', state: 'CA', zipCode: '90210', lat: 34.0905, lng: -118.4060, category: 'Plumbing' },
];

/**
 * Dynamically generate realistic mock candidates for any location/industry combo.
 * Used when real Places API is unavailable.
 */
function generateMockCandidates(options: DiscoveryOptions): LeadCandidate[] {
  const industryName = options.industry.trim().replace(/\b\w/g, l => l.toUpperCase());
  const adjectives = ['Premium', 'Green', 'Elite', 'Pro', 'First Class', 'Apex', 'Eco', 'Vibrant', 'Suncoast', 'Royal', 'All Seasons'];
  const nouns = ['Care', 'Services', 'Pros', 'Masters', 'Solutions', 'Landscaping', 'Gardeners', 'Turf', 'Maintenance'];
  const countToGenerate = Math.min(options.targetCount, 5);

  const centerLat = options.lat ?? 30.2711;
  const centerLng = options.lng ?? -97.7437;
  const city = options.city || 'Austin';
  const state = options.state || 'TX';
  const zipCode = options.zipCode || '78701';

  return Array.from({ length: countToGenerate }, (_, i) => {
    const adj = adjectives[(i * 3 + options.industry.length) % adjectives.length];
    const noun = nouns[(i * 7 + options.industry.length) % nouns.length];
    const lat = centerLat + (i * 0.003 - 0.005);
    const lng = centerLng + (i * 0.003 - 0.004);
    return {
      businessName: `${adj} ${industryName} ${noun}`,
      website: i % 3 === 0 ? null : `${adj.toLowerCase().replace(/ /g, '')}${noun.toLowerCase()}.test`,
      phoneNumber: `555-${1000 + i * 237}`,
      address: `${100 + i * 15} Oak Ave, ${city}, ${state} ${zipCode}`,
      city,
      state,
      zipCode,
      lat,
      lng,
      category: industryName,
      source: 'Mock-Generator',
    };
  });
}

export async function discoverLeads(options: DiscoveryOptions): Promise<LeadCandidate[]> {
  // ── Real Places API path ────────────────────────────────────────────────────
  if (options.lat && options.lng) {
    const radiusMeters = (options.radiusMiles ?? 10) * 1609.34;
    const query = `${options.industry} near ${options.city || ''} ${options.state || ''}`.trim();

    const places = await searchPlaces(query, options.lat, options.lng, radiusMeters, options.targetCount);

    if (places.length > 0) {
      // Deduplicate by placeId
      const seen = new Set<string>();
      const candidates: LeadCandidate[] = [];
      for (const p of places) {
        if (seen.has(p.placeId)) continue;
        seen.add(p.placeId);
        candidates.push({
          businessName: p.businessName,
          website: p.website,
          phoneNumber: p.phoneNumber,
          address: p.address,
          lat: p.lat ?? undefined,
          lng: p.lng ?? undefined,
          placeId: p.placeId,
          category: p.category ?? undefined,
          rating: p.rating ?? undefined,
          reviewCount: p.reviewCount ?? undefined,
          source: 'Google-Places',
        });
        if (candidates.length >= options.targetCount) break;
      }
      return candidates;
    }
  }

  // ── Mock fallback path ──────────────────────────────────────────────────────
  await new Promise(resolve => setTimeout(resolve, 300));

  // Try the static pool first
  let filtered = MOCK_BUSINESSES;
  if (options.zipCode) {
    filtered = filtered.filter(b => b.zipCode === options.zipCode);
  } else if (options.city && options.state) {
    filtered = filtered.filter(b =>
      b.city.toLowerCase() === options.city?.toLowerCase() &&
      b.state.toUpperCase() === options.state?.toUpperCase()
    );
  }

  if (filtered.length === 0) {
    filtered = generateMockCandidates(options) as any;
  }

  // Deduplicate
  const uniqueCandidates: LeadCandidate[] = [];
  const seenKeys = new Set<string>();
  for (const b of filtered) {
    const key = (b.website || b.businessName).toLowerCase();
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      uniqueCandidates.push({
        businessName: b.businessName,
        website: b.website,
        phoneNumber: b.phoneNumber,
        address: b.address,
        city: (b as any).city,
        state: (b as any).state,
        zipCode: (b as any).zipCode,
        lat: (b as any).lat,
        lng: (b as any).lng,
        category: (b as any).category,
        source: 'Mock-GooglePlaces',
      });
    }
    if (uniqueCandidates.length >= options.targetCount) break;
  }

  return uniqueCandidates;
}
