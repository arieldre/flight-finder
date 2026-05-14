/**
 * Hotel search adapter.
 * Primary: Playwright scraper (free, no quota, local chromium).
 * Fallback: SerpAPI google_hotels (paid, only when SERPAPI_KEY set).
 */

import serpApiPkg from 'google-search-results-nodejs';
import { execFile } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getCached, setCached, cacheKey } from '../lib/cache.js';

const { GoogleSearch } = serpApiPkg;
const __dirname = dirname(fileURLToPath(import.meta.url));
const HOTEL_SCRIPT = join(__dirname, 'fast_hotels_search.py');

// Cached ILS→USD rate
let _ilsRate = null;
async function getIlsRate() {
  if (_ilsRate) return _ilsRate;
  try {
    const res  = await fetch('https://open.er-api.com/v6/latest/ILS');
    const data = await res.json();
    _ilsRate   = data.rates?.USD ?? 0.274;
  } catch {
    _ilsRate = 0.274;
  }
  return _ilsRate;
}

/**
 * @param {string} city       - City name (e.g. "Athens", "Vienna")
 * @param {string} checkIn    - YYYY-MM-DD
 * @param {string} checkOut   - YYYY-MM-DD
 * @param {number} adults
 * @param {number} [maxPrice] - Max price/night in USD
 * @returns {Promise<HotelResult[]>}
 */
export async function searchHotels({ city, checkIn, checkOut, adults = 2, maxPrice } = {}) {
  const key = cacheKey('hotel', city, checkIn, checkOut, adults, maxPrice || '');
  const cached = getCached(key);
  if (cached) return cached;

  // Primary: local Playwright scraper (free, no API key)
  try {
    const results = await searchHotelsFree({ city, checkIn, checkOut, adults });
    if (results.length > 0) {
      const filtered = maxPrice ? results.filter(h => h.pricePerNight <= maxPrice) : results;
      if (filtered.length > 0) {
        setCached(key, filtered, 'hotels');
        return filtered;
      }
    }
  } catch (e) {
    process.stderr.write(`playwright-hotels failed: ${e.message} — trying SerpAPI\n`);
  }

  // Fallback: SerpAPI
  if (!process.env.SERPAPI_KEY) return [];

  process.stderr.write('hotels: falling back to SerpAPI\n');
  const results = await searchHotelsSerpApi({ city, checkIn, checkOut, adults });
  const nights  = nightsBetween(checkIn, checkOut);
  const filtered = maxPrice ? results.filter(h => h.pricePerNight <= maxPrice) : results;
  const enriched = filtered.map(h => ({ ...h, nights, totalPrice: h.pricePerNight * nights }));

  setCached(key, enriched, 'hotels');
  return enriched;
}

// ─── Free Playwright scraper ───────────────────────────────────────────────

async function searchHotelsFree({ city, checkIn, checkOut, adults }) {
  const ilsRate = await getIlsRate();
  const args = JSON.stringify({ city, checkIn, checkOut, adults, ilsRate, limit: 25 });
  const python = process.platform === 'win32' ? 'python' : 'python3';

  return new Promise((resolve, reject) => {
    const child = execFile(python, [HOTEL_SCRIPT], { timeout: 60000 }, (err, stdout, stderr) => {
      if (err) { reject(new Error(`playwright-hotels: ${err.message}`)); return; }
      try {
        const data = JSON.parse(stdout);
        if (data.error) { reject(new Error(`playwright-hotels: ${data.error}`)); return; }
        if (!Array.isArray(data)) { resolve([]); return; }

        // Normalize to same shape as SerpAPI results, sort cheapest first
        const hotels = data
          .filter(h => h.price != null && h.price > 0)
          .map(h => ({
            name:         h.name,
            pricePerNight: h.price,
            rating:       h.rating ?? null,
            stars:        h.stars ?? null,
            reviewCount:  null,
            amenities:    [],
            thumbnail:    null,
            nights:       h.nights,
            totalPrice:   h.totalPrice,
            source:       h.source || 'playwright-hotels',
          }))
          .sort((a, b) => a.pricePerNight - b.pricePerNight);

        resolve(hotels);
      } catch (e) {
        reject(new Error(`playwright-hotels parse error: ${e.message} — stdout: ${stdout.slice(0, 200)}`));
      }
    });
    child.stdin.write(args);
    child.stdin.end();
  });
}

// ─── SerpAPI fallback ──────────────────────────────────────────────────────

async function searchHotelsSerpApi({ city, checkIn, checkOut, adults }) {
  const client = new GoogleSearch(process.env.SERPAPI_KEY);
  return new Promise((resolve) => {
    client.json({
      engine:         'google_hotels',
      q:              `hotels in ${city}`,
      check_in_date:  checkIn,
      check_out_date: checkOut,
      adults,
      currency:       'USD',
      hl:             'en',
      sort_by:        '3',
    }, (data) => {
      if (data.error) { resolve([]); return; }
      resolve((data.properties || []).map(normalizeSerpHotel).filter(h => h.pricePerNight != null));
    });
  });
}

function normalizeSerpHotel(p) {
  const rawPrice = p.rate_per_night?.lowest ?? p.rate_per_night?.before_taxes_fees;
  return {
    name:         p.name || '',
    pricePerNight: rawPrice ? parseFloat(String(rawPrice).replace(/[^0-9.]/g, '')) : null,
    rating:       p.overall_rating ?? null,
    stars:        p.hotel_class ? parseInt(p.hotel_class) : null,
    reviewCount:  p.reviews ?? null,
    amenities:    (p.amenities || []).slice(0, 5),
    thumbnail:    p.thumbnail ?? null,
    source:       'serpapi-hotels',
  };
}

function nightsBetween(checkIn, checkOut) {
  return Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000);
}
