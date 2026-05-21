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
  source: string;
}

export interface DiscoveryOptions {
  industry: string;
  city?: string;
  state?: string;
  zipCode?: string;
  radiusMiles?: number;
  targetCount: number;
}

// Simulated data pool
const MOCK_BUSINESSES = [
  { businessName: "Apex Plumbing", website: "apexplumbing.test", phoneNumber: "555-0101", address: "101 Main St, Austin, TX", city: "Austin", state: "TX", zipCode: "78701", lat: 30.2711, lng: -97.7437 },
  { businessName: "Texas Rooter", website: null, phoneNumber: "555-0102", address: "202 Oak St, Austin, TX", city: "Austin", state: "TX", zipCode: "78701", lat: 30.2720, lng: -97.7445 },
  { businessName: "Capital Pipes", website: "capitalpipes.test", phoneNumber: "555-0103", address: "303 Pine St, Austin, TX", city: "Austin", state: "TX", zipCode: "78702", lat: 30.2695, lng: -97.7320 },
  { businessName: "NY Drain Clears", website: "nydrain.test", phoneNumber: "555-0201", address: "404 Broadway, New York, NY", city: "New York", state: "NY", zipCode: "10001", lat: 40.7505, lng: -73.9985 },
  { businessName: "Beverly Hills Plumbing", website: "bhplumb.test", phoneNumber: "555-0301", address: "505 Rodeo Dr, Beverly Hills, CA", city: "Beverly Hills", state: "CA", zipCode: "90210", lat: 34.0905, lng: -118.4060 },
];

export async function discoverLeads(options: DiscoveryOptions): Promise<LeadCandidate[]> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));

  let filtered = MOCK_BUSINESSES;

  if (options.zipCode) {
    filtered = filtered.filter(b => b.zipCode === options.zipCode);
  } else if (options.city && options.state) {
    filtered = filtered.filter(b => b.city.toLowerCase() === options.city?.toLowerCase() && b.state.toUpperCase() === options.state?.toUpperCase());
  }

  // If no static mock businesses match, dynamically generate realistic matches!
  if (filtered.length === 0) {
    const industryName = options.industry.trim().replace(/\b\w/g, l => l.toUpperCase());
    
    const adjectives = ['Premium', 'Green', 'Elite', 'Pro', 'First Class', 'Apex', 'Eco', 'Vibrant', 'Suncoast', 'Royal', 'All Seasons'];
    const nouns = ['Care', 'Services', 'Pros', 'Masters', 'Solutions', 'Landscaping', 'Gardeners', 'Turf', 'Maintenance'];
    
    const countToGenerate = Math.min(options.targetCount, 5);
    const generated = [];
    
    // Default coordinates based on options
    let centerLat = 30.2711;
    let centerLng = -97.7437;
    let city = options.city || 'Austin';
    let state = options.state || 'TX';
    let zipCode = options.zipCode || '78701';

    if (options.zipCode === '33598') {
      centerLat = 27.8184;
      centerLng = -82.3255;
      city = 'Riverview';
      state = 'FL';
      zipCode = '33598';
    } else if (options.zipCode === '78701' || options.zipCode === '78702') {
      centerLat = 30.2711;
      centerLng = -97.7437;
      city = 'Austin';
      state = 'TX';
      zipCode = options.zipCode;
    } else if (options.zipCode === '10001') {
      centerLat = 40.7501;
      centerLng = -73.9996;
      city = 'New York';
      state = 'NY';
      zipCode = '10001';
    } else if (options.zipCode === '90210') {
      centerLat = 34.0901;
      centerLng = -118.4065;
      city = 'Beverly Hills';
      state = 'CA';
      zipCode = '90210';
    } else if (options.zipCode) {
      zipCode = options.zipCode;
    }

    for (let i = 0; i < countToGenerate; i++) {
      const adj = adjectives[(i * 3 + options.industry.length) % adjectives.length];
      const noun = nouns[(i * 7 + options.industry.length) % nouns.length];
      const name = `${adj} ${industryName} ${noun}`;
      const website = i % 3 === 0 ? null : `${adj.toLowerCase().replace(' ', '')}${noun.toLowerCase()}.test`;
      const phone = `555-${1000 + i * 237}`;
      
      // Keep offsets tiny (within 1-mile)
      const latOffset = (i * 0.003 - 0.005);
      const lngOffset = (i * 0.003 - 0.004);
      const lat = centerLat + latOffset;
      const lng = centerLng + lngOffset;
      
      const address = `${100 + i * 15} Oak Ave, ${city}, ${state} ${zipCode}`;

      generated.push({
        businessName: name,
        website,
        phoneNumber: phone,
        address,
        city,
        state,
        zipCode,
        lat,
        lng,
      });
    }
    filtered = generated;
  }

  // Deduplication
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
        city: b.city,
        state: b.state,
        zipCode: b.zipCode,
        lat: b.lat,
        lng: b.lng,
        source: 'Mock-GooglePlaces',
      });
    }

    if (uniqueCandidates.length >= options.targetCount) {
      break;
    }
  }

  return uniqueCandidates;
}
