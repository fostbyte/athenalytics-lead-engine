import prisma from './prisma';

export interface PlaceResult {
  placeId: string;
  businessName: string;
  address: string | null;
  phoneNumber: string | null;
  website: string | null;
  lat: number | null;
  lng: number | null;
  rating: number | null;
  reviewCount: number | null;
  types: string[];
  category: string | null;
}

const PLACES_API_BASE = 'https://places.googleapis.com/v1';
const GEOCODING_API_BASE = 'https://maps.googleapis.com/maps/api/geocode/json';

// Essentials + contact fields – stays on the lower-cost Pro tier
const SEARCH_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.nationalPhoneNumber',
  'places.websiteUri',
  'places.location',
  'places.types',
  'places.rating',
  'places.userRatingCount',
  'places.primaryType',
].join(',');

function getApiKey(): string | null {
  const key = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
  if (!key || key.startsWith('PLACEHOLDER')) return null;
  return key;
}

const COST_PLACES = 0.032; // Text Search (Advanced) is $32.00 per 1,000 requests
const COST_GEOCODING = 0.005; // Geocoding is $5.00 per 1,000 requests

export async function checkAndLogQuota(apiName: 'places' | 'geocoding'): Promise<void> {
  const apiKey = getApiKey();
  if (!apiKey) return;

  const cost = apiName === 'places' ? COST_PLACES : COST_GEOCODING;

  // Determine start of current month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Sum cost for this month
  let currentSpend = 0;
  try {
    const aggregate = await prisma.apiUsageLog.aggregate({
      where: {
        timestamp: {
          gte: startOfMonth,
        },
      },
      _sum: {
        cost: true,
      },
    });
    currentSpend = aggregate._sum.cost || 0;
  } catch (err) {
    console.error('[Quota Check] Failed to fetch current month spend, defaulting to 0:', err);
  }

  const threshold = 140.0; // 70% of $200 free tier limit

  if (currentSpend + cost > threshold) {
    throw new Error(
      `Google Maps API monthly rate limit exceeded. Monthly safety limit of $140.00 (70% of free tier) reached. API call blocked to prevent billing charges.`
    );
  }

  // Create log record
  try {
    await prisma.apiUsageLog.create({
      data: {
        apiName,
        cost,
      },
    });
  } catch (err) {
    console.error('[Quota Check] Failed to log API usage:', err);
  }
}

function mapPlaceType(types: string[]): string | null {
  const typeMap: Record<string, string> = {
    lawn_care: 'Lawn Care',
    landscaping: 'Landscaping',
    plumber: 'Plumbing',
    electrician: 'Electrical',
    general_contractor: 'General Contractor',
    restaurant: 'Restaurant',
    beauty_salon: 'Beauty Salon',
    hair_care: 'Hair Care',
    gym: 'Fitness & Gym',
    spa: 'Spa & Wellness',
    car_repair: 'Auto Repair',
    dentist: 'Dental',
    doctor: 'Medical',
    real_estate_agency: 'Real Estate',
    accounting: 'Accounting',
    insurance_agency: 'Insurance',
    painter: 'Painting',
    roofing_contractor: 'Roofing',
    hvac_contractor: 'HVAC',
    cleaning_service: 'Cleaning Services',
    pest_control: 'Pest Control',
    moving_company: 'Moving Services',
  };
  for (const t of types) {
    if (typeMap[t]) return typeMap[t];
  }
  return null;
}

/**
 * Search for businesses using the Places API Text Search (New).
 * Falls back gracefully (returns empty array) when API key is not configured.
 */
export async function searchPlaces(
  query: string,
  lat: number,
  lng: number,
  radiusMeters: number,
  maxResults: number
): Promise<PlaceResult[]> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return [];
  }

  // Enforce quota limit check and log usage
  await checkAndLogQuota('places');

  try {
    const body = {
      textQuery: query,
      maxResultCount: Math.min(maxResults, 20), // API max is 20 per request
      locationBias: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: Math.min(radiusMeters, 50000), // API max 50km
        },
      },
    };

    const res = await fetch(`${PLACES_API_BASE}/places:searchText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': SEARCH_FIELD_MASK,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[Places API] searchText failed: ${res.status} ${errText}`);
      return [];
    }

    const data = await res.json();
    const places: any[] = data.places || [];

    return places.map((p: any): PlaceResult => ({
      placeId: p.id || '',
      businessName: p.displayName?.text || 'Unknown Business',
      address: p.formattedAddress || null,
      phoneNumber: p.nationalPhoneNumber || null,
      website: p.websiteUri || null,
      lat: p.location?.latitude ?? null,
      lng: p.location?.longitude ?? null,
      rating: p.rating ?? null,
      reviewCount: p.userRatingCount ?? null,
      types: p.types || [],
      category: mapPlaceType(p.types || []) || p.primaryType || null,
    }));
  } catch (err: any) {
    console.error(`[Places API] searchText exception: ${err.message}`);
    return [];
  }
}

/**
 * In-memory ZIP geocode cache for request lifetime.
 */
const geocodeCache = new Map<string, { lat: number; lng: number; city: string; state: string }>();

/**
 * Resolve a US ZIP code to lat/lng/city/state using the Geocoding API.
 * Returns null if the API key is not configured.
 */
export async function geocodeZip(
  zipCode: string
): Promise<{ lat: number; lng: number; city: string; state: string } | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  if (geocodeCache.has(zipCode)) {
    return geocodeCache.get(zipCode)!;
  }

  // Enforce quota limit check and log usage
  await checkAndLogQuota('geocoding');

  try {
    const url = `${GEOCODING_API_BASE}?address=${encodeURIComponent(zipCode)}&components=country:US&key=${apiKey}`;
    const res = await fetch(url);

    if (!res.ok) return null;

    const data = await res.json();
    if (data.status !== 'OK' || !data.results?.length) return null;

    const result = data.results[0];
    const lat: number = result.geometry.location.lat;
    const lng: number = result.geometry.location.lng;

    let city = '';
    let state = '';

    for (const comp of result.address_components || []) {
      if (comp.types.includes('locality')) city = comp.long_name;
      if (comp.types.includes('administrative_area_level_1')) state = comp.short_name;
    }

    const geo = { lat, lng, city, state };
    geocodeCache.set(zipCode, geo);
    return geo;
  } catch (err: any) {
    console.error(`[Geocoding API] geocodeZip exception for ${zipCode}: ${err.message}`);
    return null;
  }
}

/**
 * Geocode a city/state string to lat/lng.
 */
export async function geocodeCityState(
  city: string,
  state: string
): Promise<{ lat: number; lng: number } | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const key = `${city},${state}`;
  if (geocodeCache.has(key)) {
    const c = geocodeCache.get(key)!;
    return { lat: c.lat, lng: c.lng };
  }

  // Enforce quota limit check and log usage
  await checkAndLogQuota('geocoding');

  try {
    const address = encodeURIComponent(`${city}, ${state}, USA`);
    const url = `${GEOCODING_API_BASE}?address=${address}&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    if (data.status !== 'OK' || !data.results?.length) return null;

    const { lat, lng } = data.results[0].geometry.location;
    geocodeCache.set(key, { lat, lng, city, state });
    return { lat, lng };
  } catch (err: any) {
    console.error(`[Geocoding API] geocodeCityState exception: ${err.message}`);
    return null;
  }
}

