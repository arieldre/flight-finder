import serpApiPkg from 'google-search-results-nodejs';
import { getCached, setCached, cacheKey } from './cache.js';

const { GoogleSearch } = serpApiPkg;

export async function searchFlights({ origin, destination, departDate, returnDate, adults, tripType, maxPrice }, cacheType = 'live') {
  const key = cacheKey(origin, destination, departDate, returnDate || '', tripType, maxPrice || '');
  const cached = getCached(key);
  if (cached) return cached;

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
      // Surface price_insights if available (used for "good deal" badge)
      const priceInsights = data.price_insights || null;
      resolve([...best, ...other].map(f => normalizeResult(f, priceInsights)).filter(f => f.price != null));
    });
  });

  setCached(key, results, cacheType);
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
