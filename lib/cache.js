import fs from 'fs';
import path from 'path';
import os from 'os';

const CACHE_FILE = path.join(os.tmpdir(), 'flight-agent-cache.json');

const TTL = {
  budget: 24 * 60 * 60 * 1000,  // 24h — budget scans: stable enough, expensive to re-run
  live:   15 * 60 * 1000,        // 15min — specific route searches: prices move
};

function load() {
  try { return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); }
  catch { return {}; }
}

function save(cache) {
  try { fs.writeFileSync(CACHE_FILE, JSON.stringify(cache)); }
  catch { /* non-fatal */ }
}

export function getCached(key) {
  const entry = load()[key];
  if (!entry) return null;
  const ttl = TTL[entry.type] ?? TTL.live;
  if (Date.now() - entry.ts > ttl) return null;
  return entry.data;
}

export function setCached(key, data, type = 'live') {
  const cache = load();
  cache[key] = { ts: Date.now(), type, data };
  save(cache);
}

export function cacheKey(...parts) {
  return parts.join('|');
}
