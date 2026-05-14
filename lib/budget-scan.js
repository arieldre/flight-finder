import { searchFlights } from './search.js';
import { rankFlights, filterGarbage, formatDuration } from './rank.js';
import { CLUSTERS, HFA_CLUSTERS, destByIata } from './destinations.js';

const ORIGINS = ['TLV', 'HFA'];

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function budgetScan({ departDate, returnDate, tripType, adults, budget, flexible }) {
  // Date variations: depart -1, 0, +1 (return shifts same amount)
  const dateCombos = flexible
    ? [-1, 0, 1].map(offset => ({ depart: addDays(departDate, offset), ret: addDays(returnDate, offset) }))
    : [{ depart: departDate, ret: returnDate }];

  // Build tasks: one call per origin × cluster × date combo
  // HFA only searches clusters in HFA_CLUSTERS (limited routes from Haifa)
  const tasks = [];
  for (const origin of ORIGINS) {
    const activeClusters = origin === 'HFA'
      ? CLUSTERS.filter(c => HFA_CLUSTERS.includes(c.label))
      : CLUSTERS;

    for (const cluster of activeClusters) {
      for (const { depart, ret } of dateCombos) {
        tasks.push({ origin, cluster, depart, ret });
      }
    }
  }

  // Run in batches of 10 to avoid hammering the API
  const allResults = [];
  for (let i = 0; i < tasks.length; i += 10) {
    const batch = await Promise.all(
      tasks.slice(i, i + 10).map(({ origin, cluster, depart, ret }) =>
        searchFlights({
          origin,
          destination: cluster.airports.join(','),
          departDate: depart,
          returnDate: ret,
          adults,
          tripType,
          maxPrice: budget ? Math.round(budget * 1.3) : undefined,
        })
        .then(flights => ({ origin, cluster, depart, ret, flights }))
        .catch(() => ({ origin, cluster, depart, ret, flights: [] }))
      )
    );
    allResults.push(...batch);
  }

  // Flatten, apply garbage filter per airport, find best per destination
  const bestPerDest = {};
  for (const { origin, depart, ret, flights } of allResults) {
    for (const flight of flights) {
      const iata = flight.arrivalAirport;
      if (!iata) continue;
      const dest = destByIata(iata);
      const clean = filterGarbage([flight], dest.typicalDirect);
      if (!clean.length) continue;

      const key = iata;
      if (!bestPerDest[key] || flight.price < bestPerDest[key].flight.price) {
        bestPerDest[key] = { origin, dest: { iata, ...dest }, depart, ret, flight };
      }
    }
  }

  return Object.values(bestPerDest).sort((a, b) => a.flight.price - b.flight.price);
}

export function printBudgetResults(results, budget) {
  const under  = results.filter(r => r.flight.price <= budget);
  const nearby = results.filter(r => r.flight.price > budget && r.flight.price <= budget * 1.25);

  if (under.length === 0 && nearby.length === 0) {
    console.log('\n  Nothing under budget. Cheapest found:\n');
    results.slice(0, 6).forEach((r, i) => printRow(r, i + 1));
    return;
  }

  if (under.length > 0) {
    console.log(`\n  Under $${budget}:\n`);
    under.forEach((r, i) => printRow(r, i + 1));
  }
  if (nearby.length > 0) {
    console.log(`\n  Close (up to $${Math.round(budget * 1.25)}):\n`);
    nearby.forEach((r, i) => printRow(r, i + 1));
  }
  console.log('');
}

function printRow(r, i) {
  const { origin, dest, depart, ret, flight: f } = r;
  const stops = f.stops === 0 ? 'Direct' : `${f.stops} stop`;
  const tag   = origin === 'HFA' ? ' [Haifa]' : '';
  console.log(`  ${i}. $${f.price}  ${dest.name.padEnd(22)}  ${depart}→${ret}  ${formatDuration(f.totalDuration).padEnd(8)}  ${stops.padEnd(8)}  ${f.airline}${tag}`);
}
