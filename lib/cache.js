import fs from 'fs';
import path from 'path';
import os from 'os';

const CACHE_FILE = path.join(os.tmpdir(), 'flight-agent-cache.json');
const TTL_MS = 6 * 60 * 60 * 1000;

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
  if (!entry || Date.now() - entry.ts > TTL_MS) return null;
  return entry.data;
}

export function setCached(key, data) {
  const cache = load();
  cache[key] = { ts: Date.now(), data };
  save(cache);
}

export function cacheKey(...parts) {
  return parts.join('|');
}
