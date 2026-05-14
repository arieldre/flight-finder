import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';

const DB_PATH = path.join(os.homedir(), '.flight-agent', 'db.sqlite');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS alerts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    origin      TEXT NOT NULL,
    destination TEXT NOT NULL,
    threshold   REAL NOT NULL,
    created_at  INTEGER NOT NULL,
    triggered_at INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_alerts_route ON alerts(origin, destination);
`);

const _add    = db.prepare('INSERT INTO alerts (origin, destination, threshold, created_at) VALUES (?, ?, ?, ?)');
const _list   = db.prepare('SELECT * FROM alerts ORDER BY created_at DESC');
const _del    = db.prepare('DELETE FROM alerts WHERE id = ?');
const _mark   = db.prepare('UPDATE alerts SET triggered_at = ? WHERE id = ?');
const _active = db.prepare('SELECT * FROM alerts WHERE triggered_at IS NULL');
const _hist   = db.prepare(
  'SELECT price_usd FROM price_history WHERE route = ? ORDER BY created_at DESC LIMIT 30'
);

export function addAlert(origin, destination, threshold) {
  _add.run(origin.toUpperCase(), destination.toUpperCase(), threshold, Date.now());
}

export function listAlerts() {
  return _list.all();
}

export function deleteAlert(id) {
  _del.run(id);
}

/**
 * Check all active alerts against price_history.
 * Returns fired alerts: [{alert, currentMedian, drop}]
 * A drop fires when any recorded price is <= threshold.
 */
export function checkAlerts() {
  const alerts = _active.all();
  const fired = [];

  for (const alert of alerts) {
    const route = `${alert.origin}-${alert.destination}`;
    const rows = _hist.all(route);
    if (!rows.length) continue;

    const prices = rows.map(r => r.price_usd).sort((a, b) => a - b);
    const currentLowest = prices[0];
    const median = prices[Math.floor(prices.length / 2)];

    if (currentLowest <= alert.threshold) {
      _mark.run(Date.now(), alert.id);
      fired.push({ alert, currentLowest, median });
    }
  }

  return fired;
}

/**
 * Check if a live price beats any alert for this route.
 * Called after each flight search so alerts fire in real time.
 */
export function resetAlert(id) {
  db.prepare('UPDATE alerts SET triggered_at = NULL WHERE id = ?').run(id);
}

export function clearTriggered() {
  return db.prepare('DELETE FROM alerts WHERE triggered_at IS NOT NULL').run().changes;
}

export function checkPriceAgainstAlerts(origin, destination, priceUsd) {
  const matching = db.prepare(
    'SELECT * FROM alerts WHERE origin = ? AND destination = ? AND triggered_at IS NULL AND threshold >= ?'
  ).all(origin.toUpperCase(), destination.toUpperCase(), priceUsd);

  for (const alert of matching) {
    _mark.run(Date.now(), alert.id);
  }

  return matching;
}
