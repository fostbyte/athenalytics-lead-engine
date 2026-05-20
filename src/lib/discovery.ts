export interface LeadCandidate {
  businessName: string;
  website: string | null;
  phoneNumber: string | null;
  address: string | null;
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
  { businessName: "Apex Plumbing", website: "apexplumbing.test", phoneNumber: "555-0101", address: "101 Main St, Austin, TX", city: "Austin", state: "TX", zipCode: "78701" },
  { businessName: "Texas Rooter", website: null, phoneNumber: "555-0102", address: "202 Oak St, Austin, TX", city: "Austin", state: "TX", zipCode: "78701" },
  { businessName: "Capital Pipes", website: "capitalpipes.test", phoneNumber: "555-0103", address: "303 Pine St, Austin, TX", city: "Austin", state: "TX", zipCode: "78702" },
  { businessName: "NY Drain Clears", website: "nydrain.test", phoneNumber: "555-0201", address: "404 Broadway, New York, NY", city: "New York", state: "NY", zipCode: "10001" },
  { businessName: "Beverly Hills Plumbing", website: "bhplumb.test", phoneNumber: "555-0301", address: "505 Rodeo Dr, Beverly Hills, CA", city: "Beverly Hills", state: "CA", zipCode: "90210" },
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

  // Deduplication: using a Set of website or name as simple dedup strategy
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
        source: 'Mock-GooglePlaces',
      });
    }

    if (uniqueCandidates.length >= options.targetCount) {
      break;
    }
  }

  return uniqueCandidates;
}
