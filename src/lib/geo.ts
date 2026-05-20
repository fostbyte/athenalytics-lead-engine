export interface NormalizedGeography {
  city?: string;
  state?: string;
  zipCode?: string;
  lat?: number;
  lng?: number;
  isValid: boolean;
  errors: string[];
}

// Mock dataset for MVP
const MOCK_ZIP_DATA: Record<string, { lat: number; lng: number; city: string; state: string }> = {
  '78701': { lat: 30.2711, lng: -97.7437, city: 'Austin', state: 'TX' },
  '10001': { lat: 40.7501, lng: -73.9996, city: 'New York', state: 'NY' },
  '90210': { lat: 34.0901, lng: -118.4065, city: 'Beverly Hills', state: 'CA' },
};

export function normalizeGeography(params: {
  locationType: 'city_state' | 'zip';
  city?: string;
  state?: string;
  zipCode?: string;
}): NormalizedGeography {
  const result: NormalizedGeography = {
    isValid: false,
    errors: [],
  };

  if (params.locationType === 'zip') {
    if (!params.zipCode || !/^\d{5}$/.test(params.zipCode)) {
      result.errors.push('Invalid or missing 5-digit zipCode');
      return result;
    }

    const data = MOCK_ZIP_DATA[params.zipCode];
    if (data) {
      result.lat = data.lat;
      result.lng = data.lng;
      result.city = data.city;
      result.state = data.state;
      result.zipCode = params.zipCode;
      result.isValid = true;
    } else {
      // For MVP, if not in mock, we still accept it as valid ZIP but no lat/lng
      result.zipCode = params.zipCode;
      result.isValid = true;
    }
  } else {
    // city_state
    if (!params.city || !params.state) {
      result.errors.push('City and state are required');
      return result;
    }

    result.city = params.city.trim().replace(/\b\w/g, l => l.toUpperCase()); // Title Case
    result.state = params.state.trim().toUpperCase();
    
    if (result.state.length !== 2) {
      result.errors.push('State must be a 2-letter abbreviation');
      return result;
    }
    
    result.isValid = true;
  }

  return result;
}

export function calculateDistanceMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8; // Radius of earth in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lng2 - lng1) * Math.PI / 180;
  const a = 
    0.5 - Math.cos(dLat)/2 + 
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    (1 - Math.cos(dLon))/2;

  return R * 2 * Math.asin(Math.sqrt(a));
}
