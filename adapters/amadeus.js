// Amadeus Flight Offers Search — free developer account at developers.amadeus.com
// Set AMADEUS_CLIENT_ID + AMADEUS_CLIENT_SECRET in .env to activate.
// Test env: test.api.amadeus.com (real GDS data, rate-limited)
// Production env: api.amadeus.com (requires approval)

const BASE = 'https://test.api.amadeus.com';
let _token = null;
let _tokenExpiry = 0;

async function getToken() {
  if (_token && Date.now() < _tokenExpiry) return _token;

  const { AMADEUS_CLIENT_ID, AMADEUS_CLIENT_SECRET } = process.env;
  if (!AMADEUS_CLIENT_ID || !AMADEUS_CLIENT_SECRET) return null;

  const res = await fetch(`${BASE}/v1/security/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: AMADEUS_CLIENT_ID,
      client_secret: AMADEUS_CLIENT_SECRET,
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  _token = data.access_token;
  _tokenExpiry = Date.now() + (data.expires_in - 60) * 1000; // 60s buffer
  return _token;
}

export function isAvailable() {
  return !!(process.env.AMADEUS_CLIENT_ID && process.env.AMADEUS_CLIENT_SECRET);
}

// Returns normalized SearchResult[] — same shape as serpapi.js normalizeResult
export async function searchFlightsAmadeus({ origin, destination, departDate, returnDate, adults, tripType }) {
  const token = await getToken();
  if (!token) return [];

  const params = new URLSearchParams({
    originLocationCode:      origin,
    destinationLocationCode: destination,
    departureDate:           departDate,
    adults:                  String(adults || 1),
    currencyCode:            'USD',
    max:                     '20',
  });

  if (tripType === 'roundtrip' && returnDate) {
    params.set('returnDate', returnDate);
  }

  const res = await fetch(`${BASE}/v2/shopping/flight-offers?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return [];
  const data = await res.json();
  return (data.data || []).map(normalizeAmadeus).filter(f => f.price != null);
}

function normalizeAmadeus(offer) {
  const itinerary = offer.itineraries?.[0];
  const segments  = itinerary?.segments || [];
  const first     = segments[0] || {};
  const last      = segments[segments.length - 1] || {};

  // Duration: "PT2H30M" → minutes
  const durationStr = itinerary?.duration || '';
  const hours   = parseInt(durationStr.match(/(\d+)H/)?.[1] || '0');
  const minutes = parseInt(durationStr.match(/(\d+)M/)?.[1] || '0');

  const airlines = [...new Set(segments.map(s => s.carrierCode))].join(' + ');

  return {
    price:            parseFloat(offer.price?.grandTotal) || null,
    totalDuration:    hours * 60 + minutes,
    stops:            Math.max(0, segments.length - 1),
    airline:          airlines,
    departure:        first.departure?.at?.slice(11, 16) || '',
    arrival:          last.arrival?.at?.slice(11, 16)   || '',
    departureAirport: first.departure?.iataCode || '',
    arrivalAirport:   last.arrival?.iataCode   || '',
    layovers:         segments.slice(0, -1).map(s => s.arrival?.iataCode).filter(Boolean),
    isBest:           false,
    typicalLow:       null,
    typicalHigh:      null,
    source:           'amadeus',
  };
}
