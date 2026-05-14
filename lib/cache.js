import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';
import fs from 'fs';

const CACHE_DIR = path.join(os.homedir(), '.flight-agent');
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true, mode: 0o700 });

const DB_PATH = path.join(CACHE_DIR, 'db.sqlite');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');  // concurrent reads while writing
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS cache (
    key   TEXT PRIMARY KEY,
    data  TEXT NOT NULL,
    type  TEXT NOT NULL DEFAULT 'live',
    ts    INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS price_history (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    route        TEXT NOT NULL,
    depart_date  TEXT NOT NULL,
    return_date  TEXT,
    price_usd    REAL NOT NULL,
    carrier      TEXT,
    stops        INTEGER,
    duration_min INTEGER,
    source       TEXT NOT NULL DEFAULT 'fast-flights',
    created_at   INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_ph_route ON price_history(route, depart_date);
`);

const TTL_MS = {
  budget: 24 * 60 * 60 * 1000,
  hotels:  6 * 60 * 60 * 1000,
  live:   15 * 60 * 1000,
};

const _get  = db.prepare('SELECT data, type, ts FROM cache WHERE key = ?');
const _set  = db.prepare('INSERT OR REPLACE INTO cache (key, data, type, ts) VALUES (?, ?, ?, ?)');
const _del  = db.prepare('DELETE FROM cache WHERE ts < ?');
const _hist = db.prepare(
  'INSERT INTO price_history (route, depart_date, return_date, price_usd, carrier, stops, duration_min, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
);

// Evict expired entries once per process start
_del.run(Date.now() - 24 * 60 * 60 * 1000);

export function getCached(key) {
  const row = _get.get(key);
  if (!row) return null;
  const ttl = TTL_MS[row.type] ?? TTL_MS.live;
  if (Date.now() - row.ts > ttl) return null;
  try { return JSON.parse(row.data); }
  catch { return null; }
}

export function setCached(key, data, type = 'live') {
  _set.run(key, JSON.stringify(data), type, Date.now());
}

export function cacheKey(...parts) {
  return parts.join('|');
}

/**
 * Record a flight price in history for trend analysis.
 * @param {string} origin  - IATA
 * @param {string} dest    - IATA
 * @param {string} depart  - YYYY-MM-DD
 * @param {string|null} ret - YYYY-MM-DD or null
 * @param {object} flight  - {price, airline, stops, totalDuration}
 */
export function recordPrice(origin, dest, depart, ret, flight) {
  try {
    _hist.run(
      `${origin}-${dest}`,
      depart,
      ret ?? null,
      flight.price,
      flight.airline ?? null,
      flight.stops ?? null,
      flight.totalDuration ?? null,
      flight.source ?? 'fast-flights',
      Date.now()
    );
  } catch { /* non-fatal */ }
}

/**
 * Return price history for a route as [{price_usd, created_at, carrier}].
 */
export function getPriceHistory(origin, dest, depart) {
  return db.prepare(
    'SELECT price_usd, carrier, stops, created_at FROM price_history WHERE route = ? AND depart_date = ? ORDER BY created_at DESC LIMIT 30'
  ).all(`${origin}-${dest}`, depart);
}
