import { searchFlights } from './search.js';
import chalk from 'chalk';
import { formatDuration } from './rank.js';

// Generate every Friday in a given month (best day to catch weekend deals)
function fridaysInMonth(year, month) {
  const dates = [];
  const d = new Date(year, month - 1, 1);
  while (d.getDay() !== 5) d.setDate(d.getDate() + 1); // advance to first Friday
  while (d.getMonth() === month - 1) {
    dates.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 7);
  }
  return dates;
}

// Generate first day of each week across the month
function weeksInMonth(year, month) {
  const dates = [];
  const d = new Date(year, month - 1, 1);
  while (d.getMonth() === month - 1) {
    dates.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 7);
  }
  return dates;
}

// Parse "June 2026", "next month", etc. → { year, month }
function parseMonthArg(monthStr) {
  const now = new Date();
  if (!monthStr || monthStr === 'next month') {
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return { year: next.getFullYear(), month: next.getMonth() + 1 };
  }
  const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  const lower = monthStr.toLowerCase();
  for (let i = 0; i < months.length; i++) {
    if (lower.startsWith(months[i])) {
      const year = lower.includes('2027') ? 2027 : now.getFullYear() + (i < now.getMonth() ? 1 : 0);
      return { year, month: i + 1 };
    }
  }
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export async function calendarSweep({ origin, destination, monthStr, adults, tripType, stayDays = 7 }) {
  const { year, month } = parseMonthArg(monthStr);
  const departures = fridaysInMonth(year, month);

  if (!departures.length) return [];

  console.log(chalk.gray(`  Sweeping ${departures.length} Fridays in ${monthStr || 'next month'} from ${origin} → ${destination}...`));

  const results = await Promise.allSettled(
    departures.map(departDate => {
      const returnDate = tripType === 'roundtrip'
        ? new Date(new Date(departDate).getTime() + stayDays * 86400000).toISOString().slice(0, 10)
        : null;

      return searchFlights({ origin, destination, departDate, returnDate, adults, tripType }, 'budget')
        .then(flights => {
          if (!flights.length) return null;
          const best = [...flights].sort((a, b) => a.price - b.price)[0];
          return { departDate, returnDate, flight: best };
        });
    })
  );

  return results
    .filter(r => r.status === 'fulfilled' && r.value)
    .map(r => r.value)
    .sort((a, b) => a.flight.price - b.flight.price);
}

// Generate all 7-day windows departing Mon–Sun within a month
function weekWindowsInMonth(year, month) {
  const windows = [];
  const d = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0); // last day of month
  while (d <= monthEnd) {
    const depart = d.toISOString().slice(0, 10);
    const ret = new Date(d.getTime() + 7 * 86400000).toISOString().slice(0, 10);
    windows.push({ depart, ret });
    d.setDate(d.getDate() + 1);
  }
  return windows;
}

export async function weekSweep({ origin, destination, monthStr, adults, tripType }) {
  const { year, month } = parseMonthArg(monthStr);
  const windows = weekWindowsInMonth(year, month);

  if (!windows.length) return [];

  console.log(chalk.gray(`  Sweeping ${windows.length} 7-day windows in ${monthStr || 'next month'} from ${origin} → ${destination}...`));

  // Concurrency cap: 5 at a time (same pattern as calendarSweep)
  const results = [];
  for (let i = 0; i < windows.length; i += 5) {
    const batch = windows.slice(i, i + 5);
    const settled = await Promise.allSettled(
      batch.map(({ depart, ret }) => {
        const returnDate = tripType === 'roundtrip' ? ret : null;
        return searchFlights({ origin, destination, departDate: depart, returnDate, adults, tripType }, 'budget')
          .then(flights => {
            if (!flights.length) return null;
            const best = [...flights].sort((a, b) => a.price - b.price)[0];
            return { depart, ret: returnDate, price: best.price, airline: best.airline, stops: best.stops };
          });
      })
    );
    for (const r of settled) {
      if (r.status === 'fulfilled' && r.value) results.push(r.value);
    }
  }

  // Dedup: same depart date → keep cheapest
  const byDepart = new Map();
  for (const r of results) {
    const existing = byDepart.get(r.depart);
    if (!existing || r.price < existing.price) byDepart.set(r.depart, r);
  }

  return [...byDepart.values()].sort((a, b) => a.price - b.price);
}

export function printWeekSweepResults(results, origin, destination) {
  if (!results.length) {
    console.log(chalk.red('  No results for that month.\n'));
    return;
  }

  const cheapest = results[0].price;
  const label = `${origin} → ${destination}`;

  console.log(chalk.bold(`\n  ${label} — cheapest 7-day windows\n`));

  results.forEach((r, i) => {
    const isLowest = r.price === cheapest;
    const priceStr = isLowest
      ? chalk.bold.green(`$${r.price} ★`)
      : chalk.green(`$${r.price}`);
    const retStr = r.ret ? ` → ${r.ret}` : '';
    const stops = r.stops === 0 ? chalk.green('Direct') : chalk.yellow(`${r.stops} stop`);

    console.log(
      `  ${String(i + 1).padStart(2)}. ${r.depart}${retStr}  ${priceStr.padEnd(16)}  ` +
      `${stops}  ${chalk.gray(r.airline)}`
    );
  });

  const avg = Math.round(results.reduce((s, r) => s + r.price, 0) / results.length);
  console.log(chalk.gray(`\n  Avg: $${avg}  |  Best: $${cheapest}  |  ${results.length} windows checked`));
  console.log('');
}

export function printCalendarResults(results, origin, destination) {
  if (!results.length) {
    console.log(chalk.red('  No results for that month.\n'));
    return;
  }

  const cheapest = results[0].flight.price;
  const label = `${origin} → ${destination}`;

  console.log(chalk.bold(`\n  ${label} — cheapest by departure date\n`));

  results.forEach((r, i) => {
    const f = r.flight;
    const isLowest = f.price === cheapest;
    const priceStr = isLowest
      ? chalk.bold.green(`$${f.price} ★`)
      : chalk.green(`$${f.price}`);
    const ret = r.returnDate ? ` → ${r.returnDate}` : '';
    const stops = f.stops === 0 ? chalk.green('Direct') : chalk.yellow(`${f.stops} stop`);

    console.log(
      `  ${String(i + 1).padStart(2)}. ${r.departDate}${ret}  ${priceStr.padEnd(16)}  ` +
      `${formatDuration(f.totalDuration).padEnd(8)}  ${stops}  ${chalk.gray(f.airline)}`
    );
  });

  const avg = Math.round(results.reduce((s, r) => s + r.flight.price, 0) / results.length);
  console.log(chalk.gray(`\n  Avg: $${avg}  |  Best: $${cheapest}  |  ${results.length} Fridays checked`));
  console.log('');
}
