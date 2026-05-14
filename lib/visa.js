import chalk from 'chalk';
import passportIL from '../passports/IL.js';

// Swap passport here for open-source users — just change the import above.
const PASSPORT = passportIL;

const BADGE = {
  visa_free: (d) => chalk.green(`✓ free${d?.days ? ` ${d.days}d` : ''}`),
  eta:       ()  => chalk.yellow('○ ETA'),
  evisa:     ()  => chalk.yellow('○ eVisa'),
  voa:       ()  => chalk.yellow('○ VoA'),
  required:  ()  => chalk.red('✗ visa req'),
  banned:    ()  => chalk.bgRed.white('✗ BANNED'),
  unknown:   ()  => chalk.gray('? unknown'),
};

export function getVisa(countryCode) {
  if (!countryCode) return null;
  return PASSPORT.countries[countryCode] || null;
}

export function visaBadge(countryCode) {
  const d = getVisa(countryCode);
  if (!d) return chalk.gray('? visa');
  const fn = BADGE[d.status] || BADGE.unknown;
  return fn(d);
}

export function visaWarning(countryCode) {
  const d = getVisa(countryCode);
  if (!d) return null;
  if (d.status === 'banned') return chalk.bgRed.white(` ⚠ BANNED: ${d.note} `);
  if (d.status === 'eta' || d.status === 'evisa') return chalk.yellow(`  ↳ ${d.note || ''}`);
  return null;
}

// True if destination is accessible (not banned)
export function isAccessible(countryCode) {
  const d = getVisa(countryCode);
  return !d || d.status !== 'banned';
}

export const passportNote = `Passport: ${PASSPORT.passport} · Updated: ${PASSPORT.lastUpdated} · Always verify before booking.`;
