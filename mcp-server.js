import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { searchFlights } from './lib/search.js';
import { searchHotels } from './adapters/hotels.js';

// ─── Rate limiter: rolling window + burst concurrency cap ────────────────────

const callTimestamps = [];
let _inFlight = 0;
const MAX_INFLIGHT = 3;

function checkRateLimit() {
  const now = Date.now();
  const windowStart = now - 60_000;
  while (callTimestamps.length > 0 && callTimestamps[0] < windowStart) callTimestamps.shift();
  if (callTimestamps.length >= 10) return false;
  if (_inFlight >= MAX_INFLIGHT) return false;
  callTimestamps.push(now);
  return true;
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function formatFlights(results) {
  if (!results || results.length === 0) return 'No flights found for this route/date.';
  return results.slice(0, 5).map((f, i) => {
    const stops = f.stops === 0 ? 'Direct' : `${f.stops} stop${f.stops > 1 ? 's' : ''}`;
    const dur = f.totalDuration ? `${Math.floor(f.totalDuration / 60)}h ${f.totalDuration % 60}m` : '';
    const parts = [`${i + 1}. ${f.airline} $${f.price}`, stops, dur].filter(Boolean);
    return parts.join(' — ');
  }).join('\n');
}

function formatHotels(results) {
  if (!results || results.length === 0) return 'No hotels found.';
  return results.slice(0, 5).map((h, i) => {
    const stars = h.stars ? '★'.repeat(h.stars) : '';
    const rating = h.rating ? `${h.rating}⭐` : '';
    const parts = [`${i + 1}. ${h.name}`, `$${h.pricePerNight}/night`, stars, rating].filter(Boolean);
    return parts.join(' — ');
  }).join('\n');
}

// ─── MCP Server ───────────────────────────────────────────────────────────────

const server = new McpServer({
  name: 'flight-agent',
  version: '1.0.0',
});

const IATA   = z.string().regex(/^[A-Z]{3}$/, 'Must be a 3-letter IATA airport code');
const DATE   = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')
  .refine(d => new Date(d) >= new Date(new Date().toISOString().slice(0, 10)), 'Date cannot be in the past')
  .refine(d => new Date(d) <= new Date(Date.now() + 365 * 86400000), 'Date too far in future (max 365 days)');
const ADULTS = z.number().int().min(1).max(9).default(1);
const CITY   = z.string().min(1).max(100).regex(/^[\w\s,'\-\.]+$/, 'Invalid city name characters');

server.tool(
  'search_flights',
  'Search for flights between two airports on specific dates',
  {
    origin:      IATA.describe('Origin airport IATA code, e.g. TLV'),
    destination: IATA.describe('Destination airport IATA code, e.g. ATH'),
    departDate:  DATE.describe('Departure date YYYY-MM-DD'),
    returnDate:  DATE.optional().describe('Return date YYYY-MM-DD (omit for one-way)'),
    adults:      ADULTS.describe('Number of adult passengers (1-9)'),
  },
  async ({ origin, destination, departDate, returnDate, adults }) => {
    if (!checkRateLimit()) {
      return { content: [{ type: 'text', text: 'Rate limit: 10 requests/minute. Please wait.' }] };
    }
    _inFlight++;
    try {
      const tripType = returnDate ? 'roundtrip' : 'oneway';
      const results = await searchFlights({ origin, destination, departDate, returnDate, adults, tripType });
      return { content: [{ type: 'text', text: formatFlights(results) }] };
    } catch (e) {
      process.stderr.write(`[mcp] search_flights error: ${e.message}\n`);
      return { content: [{ type: 'text', text: 'No flights found for this route/date.' }] };
    } finally {
      _inFlight--;
    }
  }
);

server.tool(
  'search_hotels',
  'Search for hotels in a city for specific dates',
  {
    city:     CITY.describe('City name, e.g. "Athens", "Rome"'),
    checkIn:  DATE.describe('Check-in date YYYY-MM-DD'),
    checkOut: DATE.describe('Check-out date YYYY-MM-DD'),
    adults:   z.number().int().min(1).max(9).default(2).describe('Number of adults'),
    maxPrice: z.number().positive().max(50000).optional().describe('Maximum price per night in USD'),
  },
  {
    // refine cross-field: checkIn must be before checkOut
  },
  async ({ city, checkIn, checkOut, adults, maxPrice }) => {
    if (checkIn >= checkOut) {
      return { content: [{ type: 'text', text: 'checkIn must be before checkOut.' }] };
    }
    if (!checkRateLimit()) {
      return { content: [{ type: 'text', text: 'Rate limit: 10 requests/minute. Please wait.' }] };
    }
    _inFlight++;
    try {
      const results = await searchHotels({ city, checkIn, checkOut, adults, maxPrice });
      return { content: [{ type: 'text', text: formatHotels(results) }] };
    } catch (e) {
      process.stderr.write(`[mcp] search_hotels error: ${e.message}\n`);
      return { content: [{ type: 'text', text: 'No hotels found.' }] };
    } finally {
      _inFlight--;
    }
  }
);

// ─── Start ────────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
