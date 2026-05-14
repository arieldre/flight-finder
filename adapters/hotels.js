/**
 * Hotel search adapter — SerpAPI google_hotels engine.
 * Primary source; swap inner fetch for free alternative when available.
 * Returns cheapest hotels per city sorted by price/night.
 */

import serpApiPkg from 'google-search-results-nodejs';
import { getCached, setCached, cacheKey } from '../lib/cache.js';

const { GoogleSearch } = serpApiPkg;

/**
 * @param {string} city       - City name (e.g. "Athens", "Vienna")
 * @param {string} checkIn    - YYYY-MM-DD
 * @param {string} checkOut   - YYYY-MM-DD
 * @param {number} adults
 * @param {number} [maxPrice] - Max price/night in USD
 * @returns {Promise<HotelResult[]>}
 */
export async function searchHotels({ city, checkIn, checkOut, adults = 2, maxPrice } = {}) {
  if (!process.env.SERPAPI_KEY) return [];

  const key = cacheKey('hotel', city, checkIn, checkOut, adults, maxPrice || '');
  const cached = getCached(key);
  if (cached) return cached;

  const client = new GoogleSearch(process.env.SERPAPI_KEY);

  const params = {
    engine:         'google_hotels',
    q:              `hotels in ${city}`,
    check_in_date:  checkIn,
    check_out_date: checkOut,
    adults,
    currency:       'USD',
    hl:             'en',
    sort_by:        '3',  // lowest price first
  };

  const results = await new Promise((resolve) => {
    client.json(params, (data) => {
      if (data.error) { resolve([]); return; }
      resolve((data.properties || []).map(normalizeHotel).filter(h => h.pricePerNight != null));
    });
  });

  const nights = nightsBetween(checkIn, checkOut);
  const filtered = maxPrice ? results.filter(h => h.pricePerNight <= maxPrice) : results;

  // Attach night count so callers can compute total without recalculating
  const enriched = filtered.map(h => ({ ...h, nights, totalPrice: h.pricePerNight * nights }));

  setCached(key, enriched, 'hotels');
  return enriched;
}

function normalizeHotel(p) {
  const rawPrice = p.rate_per_night?.lowest ?? p.rate_per_night?.before_taxes_fees;
  const pricePerNight = rawPrice ? parseFloat(String(rawPrice).replace(/[^0-9.]/g, '')) : null;
  const stars = p.hotel_class ? parseInt(p.hotel_class) : null;

  return {
    name:         p.name || '',
    pricePerNight,
    rating:       p.overall_rating ?? null,
    stars,
    reviewCount:  p.reviews ?? null,
    amenities:    (p.amenities || []).slice(0, 5),
    thumbnail:    p.thumbnail ?? null,
    source:       'serpapi-hotels',
  };
}

function nightsBetween(checkIn, checkOut) {
  const ms = new Date(checkOut) - new Date(checkIn);
  return Math.round(ms / 86400000);
}
