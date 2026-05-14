/**
 * fast-flights adapter — wraps the Python fast-flights package.
 * No API key required. Reverse-engineers Google Flights protobuf.
 * Requires: pip install fast-flights (Python 3.8+)
 */

import { execFile } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT    = join(__dirname, 'fast_flights_search.py');

// Cached ILS→USD rate (refreshed once per process, fallback hardcoded)
let _ilsRate = null;
async function getIlsRate() {
  if (_ilsRate) return _ilsRate;
  try {
    const res  = await fetch('https://open.er-api.com/v6/latest/ILS');
    const data = await res.json();
    _ilsRate   = data.rates?.USD ?? 0.274;
  } catch {
    _ilsRate = 0.274; // ~3.65 ILS/USD fallback
  }
  return _ilsRate;
}

export function isAvailable() {
  return true; // fast-flights requires no API key — always try
}

export async function searchFlightsFast({ origin, destination, departDate, returnDate, adults, tripType }) {
  const ilsRate = await getIlsRate();

  const args = JSON.stringify({
    from:       origin,
    to:         destination,
    date:       departDate,
    returnDate: returnDate || null,
    adults:     adults || 1,
    trip:       tripType === 'oneway' ? 'one-way' : 'round-trip',
    maxStops:   2,
    ilsRate,
  });

  return new Promise((resolve, reject) => {
    const python = process.platform === 'win32' ? 'python' : 'python3';
    const child  = execFile(python, [SCRIPT], { timeout: 30000 }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(`fast-flights: ${err.message}`));
        return;
      }
      try {
        const data = JSON.parse(stdout);
        if (data.error) {
          reject(new Error(`fast-flights: ${data.error}`));
          return;
        }
        resolve(Array.isArray(data) ? data.filter(f => f.price != null) : []);
      } catch (e) {
        reject(new Error(`fast-flights parse error: ${e.message} — stdout: ${stdout.slice(0, 200)}`));
      }
    });

    child.stdin.write(args);
    child.stdin.end();
  });
}
