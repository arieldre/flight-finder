import { searchFlights } from './search.js';
import { rankFlights, filterGarbage, formatDuration } from './rank.js';
import { CLUSTERS, HFA_CLUSTERS, destByIata } from './destinations.js';
import { visaBadge, isAccessible } from './visa.js';
import { searchHotels } from '../adapters/hotels.js';
import { detectSemanticFilter } from './semantic.js';
import chalk from 'chalk';

const ORIGINS = ['TLV', 'HFA'];

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function budgetScan({ departDate, returnDate, tripType, adults, budget, flexible, mode = 'flights', semanticQuery = null }) {
  const dateCombos = flexible
    ? [-1, 0, 1].map(offset => ({ depart: addDays(departDate, offset), ret: addDays(returnDate, offset) }))
    : [{ depart: departDate, ret: returnDate }];

  const tasks = [];
  for (const origin of ORIGINS) {
    const activeClusters = origin === 'HFA'
      ? CLUSTERS.filter(c => HFA_CLUSTERS.includes(c.label))
      : CLUSTERS;

    for (const cluster of activeClusters) {
      for (const airport of cluster.airports) {
        for (const { depart, ret } of dateCombos) {
          tasks.push({ origin, airport, cluster, depart, ret });
        }
      }
    }
  }

  // Semantic tag filtering — build airport→tags lookup from CLUSTERS, then filter tasks
  if (semanticQuery) {
    const semFilter = await detectSemanticFilter(semanticQuery);
    if (semFilter.hasSemanticFilter && semFilter.tags.length > 0) {
      // Build airport→tags map from DEST_MAP via cluster destinations
      // CLUSTERS reference airports; tags live on DEST_MAP entries via destByIata
      const matchingAirports = new Set(
        tasks
          .map(t => t.airport)
          .filter(iata => {
            const dest = destByIata(iata);
            const destTags = dest.tags || [];
            return semFilter.tags.some(tag => destTags.includes(tag));
          })
      );
      const before = tasks.length;
      tasks.splice(0, tasks.length, ...tasks.filter(t => matchingAirports.has(t.airport)));
      process.stderr.write(`  Semantic filter [${semFilter.tags.join(', ')}]: ${before} → ${tasks.length} tasks\n`);
    }
  }

  // Concurrency cap: 10 parallel — 20+ triggers Google rate-limit (HTML response instead of flights)
  const CONCURRENCY = 10;
  const allResults = [];
  let idx = 0;
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (idx < tasks.length) {
      const { origin, airport, cluster, depart, ret } = tasks[idx++];
      const result = await searchFlights({
        origin,
        destination: airport,
        departDate: depart,
        returnDate: ret,
        adults,
        tripType,
        maxPrice: budget ? Math.round(budget * 1.3) : undefined,
      }, 'budget')
        .then(flights => ({ origin, cluster, depart, ret, flights }))
        .catch(() => ({ origin, cluster, depart, ret, flights: [] }));
      allResults.push(result);
    }
  });
  await Promise.all(workers);

  // Flatten, filter inaccessible (banned passport), apply garbage filter, find best per destination
  const bestPerDest = {};
  for (const { origin, depart, ret, flights } of allResults) {
    for (const flight of flights) {
      const iata = flight.arrivalAirport;
      if (!iata) continue;
      const dest = destByIata(iata);
      if (!isAccessible(dest.country)) continue;
      const clean = filterGarbage([flight], dest.typicalDirect);
      if (!clean.length) continue;

      const key = iata;
      if (!bestPerDest[key] || flight.price < bestPerDest[key].flight.price) {
        bestPerDest[key] = { origin, dest: { iata, ...dest }, depart, ret, flight };
      }
    }
  }

  const sorted = Object.values(bestPerDest).sort((a, b) => a.flight.price - b.flight.price);

  // Hotel enrichment — only for top 12 results to conserve SerpAPI quota
  if (mode === 'trip' && sorted.length > 0) {
    process.stderr.write('  Fetching hotel prices for top destinations...\n');
    const top = sorted.slice(0, 12);
    const HOTEL_CONCURRENCY = 5;
    let hi = 0;
    const hotelWorkers = Array.from({ length: HOTEL_CONCURRENCY }, async () => {
      while (hi < top.length) {
        const r = top[hi++];
        const hotels = await searchHotels({
          city: r.dest.name,
          checkIn: r.depart,
          checkOut: r.ret,
          adults: adults || 2,
        }).catch(() => []);
        r.hotel = hotels[0] ?? null;  // cheapest hotel at that destination
      }
    });
    await Promise.all(hotelWorkers);
  }

  return sorted;
}

export function printBudgetResults(results, budget, mode = 'flights') {
  const hasHotels = mode === 'trip';

  // For trip mode, sort by total (flight + hotel total), not just flight
  if (hasHotels) {
    results = results
      .map(r => ({
        ...r,
        _total: r.flight.price + (r.hotel?.totalPrice ?? Infinity),
      }))
      .sort((a, b) => a._total - b._total);
  }

  const getPrice = r => hasHotels
    ? (r.hotel ? r._total : r.flight.price)
    : r.flight.price;

  const under  = results.filter(r => getPrice(r) <= budget);
  const nearby = results.filter(r => getPrice(r) > budget && getPrice(r) <= budget * 1.25);

  if (under.length === 0 && nearby.length === 0) {
    console.log('\n  Nothing under budget. Cheapest found:\n');
    results.slice(0, 6).forEach((r, i) => printRow(r, i + 1, hasHotels));
    return;
  }

  if (under.length > 0) {
    const label = hasHotels ? `Under $${budget} total trip` : `Under $${budget}`;
    console.log(`\n  ${label}:\n`);
    under.forEach((r, i) => printRow(r, i + 1, hasHotels));
  }
  if (nearby.length > 0) {
    const label = hasHotels ? `Close (up to $${Math.round(budget * 1.25)} total)` : `Close (up to $${Math.round(budget * 1.25)})`;
    console.log(`\n  ${label}:\n`);
    nearby.forEach((r, i) => printRow(r, i + 1, hasHotels));
  }
  console.log('');
}

function printRow(r, i, hasHotels = false) {
  const { origin, dest, depart, ret, flight: f, hotel: h } = r;
  const stops = f.stops === 0 ? chalk.green('Direct') : chalk.yellow(`${f.stops} stop`);
  const tag   = origin === 'HFA' ? chalk.gray(' [Haifa]') : '';
  const visa  = visaBadge(dest.country);
  const deal  = priceContextBadge(f);

  if (!hasHotels) {
    console.log(
      `  ${chalk.bold(String(i).padStart(2))}. ` +
      `${chalk.bold.green(`$${f.price}`.padEnd(7))}  ` +
      `${dest.name.padEnd(24)}  ` +
      `${depart}→${ret}  ` +
      `${formatDuration(f.totalDuration).padEnd(8)}  ` +
      `${stops.padEnd(14)}  ` +
      `${visa}  ` +
      `${f.airline}${tag}${deal}`
    );
    return;
  }

  // Trip mode — show flight + hotel + total
  const hotelStr = h
    ? chalk.cyan(`$${h.pricePerNight}/night`) + chalk.gray(` ${h.name.slice(0, 20)}`)
    : chalk.gray('hotel n/a');
  const totalStr = h
    ? chalk.bold.magenta(`$${f.price + h.totalPrice} total`)
    : chalk.bold.green(`$${f.price} flight only`);

  console.log(
    `  ${chalk.bold(String(i).padStart(2))}. ` +
    `${totalStr.padEnd(18)}  ` +
    `${dest.name.padEnd(20)}  ` +
    `${depart}→${ret}  ` +
    `${chalk.green(`✈ $${f.price}`)} ${stops}  ` +
    `${hotelStr}  ` +
    `${visa}${tag}`
  );
}

function priceContextBadge(f) {
  if (!f.typicalLow || !f.typicalHigh) return '';
  if (f.price < f.typicalLow) return chalk.green(' ↓ below typical');
  if (f.price > f.typicalHigh) return chalk.red(' ↑ above typical');
  return '';
}
