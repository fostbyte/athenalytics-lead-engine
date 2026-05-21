import { geocodeZip as placesGeocodeZip, geocodeCityState as placesGeocodeCityState } from './places';

export interface NormalizedGeography {
  city?: string;
  state?: string;
  zipCode?: string;
  lat?: number;
  lng?: number;
  isValid: boolean;
  errors: string[];
}

// Static fallback dataset — used when GOOGLE_PLACES_API_KEY is not configured
const MOCK_ZIP_DATA: Record<string, { lat: number; lng: number; city: string; state: string }> = {
  '78701': { lat: 30.2711, lng: -97.7437, city: 'Austin', state: 'TX' },
  '10001': { lat: 40.7501, lng: -73.9996, city: 'New York', state: 'NY' },
  '90210': { lat: 34.0901, lng: -118.4065, city: 'Beverly Hills', state: 'CA' },
  '33598': { lat: 27.8184, lng: -82.3255, city: 'Riverview', state: 'FL' },
  '33101': { lat: 25.7617, lng: -80.1918, city: 'Miami', state: 'FL' },
  '30301': { lat: 33.7490, lng: -84.3880, city: 'Atlanta', state: 'GA' },
  '60601': { lat: 41.8827, lng: -87.6233, city: 'Chicago', state: 'IL' },
  '77001': { lat: 29.7604, lng: -95.3698, city: 'Houston', state: 'TX' },
  '85001': { lat: 33.4484, lng: -112.0740, city: 'Phoenix', state: 'AZ' },
  '19101': { lat: 39.9526, lng: -75.1652, city: 'Philadelphia', state: 'PA' },
  '78201': { lat: 29.4241, lng: -98.4936, city: 'San Antonio', state: 'TX' },
  '92101': { lat: 32.7157, lng: -117.1611, city: 'San Diego', state: 'CA' },
  '75201': { lat: 32.7767, lng: -96.7970, city: 'Dallas', state: 'TX' },
  '95101': { lat: 37.3382, lng: -121.8863, city: 'San Jose', state: 'CA' },
  '78401': { lat: 27.8006, lng: -97.3964, city: 'Corpus Christi', state: 'TX' },
};

export async function normalizeGeography(params: {
  locationType: 'city_state' | 'zip';
  city?: string;
  state?: string;
  zipCode?: string;
}): Promise<NormalizedGeography> {
  const result: NormalizedGeography = { isValid: false, errors: [] };

  if (params.locationType === 'zip') {
    if (!params.zipCode || !/^\d{5}$/.test(params.zipCode)) {
      result.errors.push('Invalid or missing 5-digit zipCode');
      return result;
    }

    // 1. Try real Google Geocoding API
    const realGeo = await placesGeocodeZip(params.zipCode);
    if (realGeo) {
      result.lat = realGeo.lat;
      result.lng = realGeo.lng;
      result.city = realGeo.city;
      result.state = realGeo.state;
      result.zipCode = params.zipCode;
      result.isValid = true;
      return result;
    }

    // 2. Fall back to static mock table
    const data = MOCK_ZIP_DATA[params.zipCode];
    if (data) {
      result.lat = data.lat;
      result.lng = data.lng;
      result.city = data.city;
      result.state = data.state;
      result.zipCode = params.zipCode;
    } else {
      result.zipCode = params.zipCode;
    }
    result.isValid = true;
  } else {
    // city_state
    if (!params.city || !params.state) {
      result.errors.push('City and state are required');
      return result;
    }

    result.city = params.city.trim().replace(/\b\w/g, l => l.toUpperCase());
    result.state = params.state.trim().toUpperCase();

    if (result.state.length !== 2) {
      result.errors.push('State must be a 2-letter abbreviation');
      return result;
    }

    // Try real geocoding for city/state
    const realGeo = await placesGeocodeCityState(result.city, result.state);
    if (realGeo) {
      result.lat = realGeo.lat;
      result.lng = realGeo.lng;
    }

    result.isValid = true;
  }

  return result;
}

export function calculateDistanceMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lng2 - lng1) * Math.PI / 180;
  const a =
    0.5 - Math.cos(dLat) / 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    (1 - Math.cos(dLon)) / 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}
