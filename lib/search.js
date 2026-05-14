import serpApiPkg from 'google-search-results-nodejs';
import { getCached, setCached, cacheKey, recordPrice } from './cache.js';
import { searchFlightsFast } from '../adapters/fast-flights.js';

const { GoogleSearch } = serpApiPkg;

// Primary: fast-flights (free, no key). Fallback: SerpAPI (if SERPAPI_KEY set).
export async function searchFlights({ origin, destination, departDate, returnDate, adults, tripType, maxPrice }, cacheType = 'live') {
  const key = cacheKey(origin, destination, departDate, returnDate || '', tripType, maxPrice || '');
  const cached = getCached(key);
  if (cached) return cached;

  // Try fast-flights first (free, no API key).
  // Multi-airport destinations (e.g. "LHR,LGW,STN") are SerpAPI-only — skip fast-flights.
  const canUseFast = !destination.includes(',');
  try {
    if (!canUseFast) throw new Error('multi-airport destination');
    const results = await searchFlightsFast({ origin, destination, departDate, returnDate, adults, tripType });
    if (results.length > 0) {
      const filtered = maxPrice ? results.filter(f => f.price <= maxPrice) : results;
      setCached(key, filtered, cacheType);
      if (filtered.length) recordPrice(origin, destination, departDate, returnDate || null, filtered[0]);
      return filtered;
    }
  } catch (e) {
    // fast-flights failed — fall through to SerpAPI
    process.stderr.write(`fast-flights failed: ${e.message} — trying SerpAPI\n`);
  }

  // Fallback: SerpAPI
  if (!process.env.SERPAPI_KEY) throw new Error('No SERPAPI_KEY and fast-flights returned no results');

  const params = {
    engine: 'google_flights',
    departure_id: origin,
    arrival_id: destination,
    outbound_date: departDate,
    currency: 'USD',
    hl: 'en',
    adults: adults || 1,
  };

  if (tripType === 'roundtrip' && returnDate) {
    params.return_date = returnDate;
    params.type = '1';
  } else {
    params.type = '2';
  }

  if (maxPrice) params.max_price = maxPrice;

  const client = new GoogleSearch(process.env.SERPAPI_KEY);

  const results = await new Promise((resolve, reject) => {
    client.json(params, (data) => {
      if (data.error) return reject(new Error(data.error));
      const best  = (data.best_flights  || []).map(f => ({ ...f, _tier: 'best' }));
      const other = (data.other_flights || []).map(f => ({ ...f, _tier: 'other' }));
      const priceInsights = data.price_insights || null;
      resolve([...best, ...other].map(f => normalizeResult(f, priceInsights)).filter(f => f.price != null));
    });
  });

  setCached(key, results, cacheType);
  if (results.length) recordPrice(origin, destination, departDate, returnDate || null, results[0]);
  return results;
}

function normalizeResult(f, priceInsights) {
  const legs     = f.flights || [];
  const firstLeg = legs[0] || {};
  const lastLeg  = legs[legs.length - 1] || {};

  return {
    price:            typeof f.price === 'number' ? f.price : null,
    totalDuration:    f.total_duration,
    stops:            Math.max(0, legs.length - 1),
    airline:          legs.map(l => l.airline).filter((v, i, a) => a.indexOf(v) === i).join(' + '),
    departure:        firstLeg.departure_airport?.time || '',
    arrival:          lastLeg.arrival_airport?.time   || '',
    departureAirport: firstLeg.departure_airport?.id  || '',
    arrivalAirport:   lastLeg.arrival_airport?.id     || '',
    layovers:         (f.layovers || []).map(l => l.name),
    isBest:           f._tier === 'best',
    // Price context from SerpAPI — null if not returned
    typicalLow:       priceInsights?.typical_range_low  ?? null,
    typicalHigh:      priceInsights?.typical_range_high ?? null,
  };
}
