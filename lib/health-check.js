import { searchFlights } from './search.js';

// Returns the first Monday >= today + 14 days
function firstMondayIn14Days() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 14);
  // 0=Sun,1=Mon...6=Sat — advance to next Monday
  const dayOfWeek = d.getDay();
  if (dayOfWeek !== 1) {
    d.setDate(d.getDate() + ((8 - dayOfWeek) % 7));
  }
  return d.toISOString().slice(0, 10);
}

function addDays(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export async function runHealthCheck() {
  try {
    const departDate = firstMondayIn14Days();
    const returnDate = addDays(departDate, 3);

    const results = await searchFlights({
      origin: 'TLV',
      destination: 'ATH',
      departDate,
      returnDate,
      adults: 1,
      tripType: 'roundtrip',
    });

    if (!results || results.length === 0) {
      process.stderr.write('[health] WARNING: flight scraper returned 0 results — selectors may be stale\n');
    } else {
      process.stderr.write(`[health] OK: flight scraper returned ${results.length} results\n`);
    }
  } catch (e) {
    process.stderr.write(`[health] WARNING: flight scraper returned 0 results — selectors may be stale\n`);
  }
}
