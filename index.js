import 'dotenv/config';
import readline from 'readline';
import chalk from 'chalk';
import { parseQuery } from './lib/parser.js';
import { searchFlights } from './lib/search.js';
import { rankFlights, filterGarbage } from './lib/rank.js';
import { printBanner, printParsed, printResults, printError } from './lib/display.js';
import { budgetScan, printBudgetResults } from './lib/budget-scan.js';
import { searchViaHubs, printConnectionResults } from './lib/connections.js';
import { calendarSweep, printCalendarResults } from './lib/calendar-sweep.js';
import { searchHotels } from './adapters/hotels.js';
import { destByIata } from './lib/destinations.js';
import { runHealthCheck } from './lib/health-check.js';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(resolve => rl.question(q, resolve));

const SORT_MODES = { '1': 'cheapest', '2': 'fastest', '3': 'best' };

async function pickSortMode() {
  const ans = await ask(
    chalk.bold('  Sort by: ') +
    chalk.cyan('[1]') + ' Cheapest  ' +
    chalk.cyan('[2]') + ' Fastest  ' +
    chalk.cyan('[3]') + ' Best (balanced)  ' +
    chalk.gray('> ')
  );
  return SORT_MODES[ans.trim()] || 'best';
}

async function confirmParams(params) {
  const rt   = params.returnDate ? ` → ${params.returnDate}` : '';
  const via  = params.connectionMode
    ? ` via ${params.preferredHub || 'best hub'}`
    : '';
  const ans = await ask(
    chalk.gray(`  Parsed: ${params.origin} → ${params.destination}${via}, ${params.departDate}${rt}, ${params.adults} adult(s). Correct? `) +
    chalk.cyan('[y/n] > ')
  );
  return ans.trim().toLowerCase() !== 'n';
}

async function runBudgetScan(params) {
  const { budget, departDate, returnDate, tripType, adults, flexible, mode = 'flights' } = params;
  const combos = flexible ? '3 date combos' : '1 date';
  const modeLabel = mode === 'trip' ? ' + hotels' : '';
  process.stdout.write(chalk.gray(`  Scanning destinations × ${combos} from TLV + HFA${modeLabel} (cached 24h)...`));

  let results;
  try {
    results = await budgetScan({ departDate, returnDate, tripType, adults, budget, flexible, mode, semanticQuery: params.semanticQuery || null });
    process.stdout.write('\r' + ' '.repeat(70) + '\r');
  } catch (e) {
    process.stdout.write('\r' + ' '.repeat(70) + '\r');
    printError(e.message);
    return null;
  }

  printBudgetResults(results, budget || Infinity, mode);
  return results;
}

async function runHotelSearch(params) {
  const { destination, departDate, returnDate, adults, budget } = params;
  const cityName = destination ? (destByIata(destination)?.name || destination) : null;
  if (!cityName) {
    printError('Need a destination for hotel search. Try: "hotels in Athens next August for a week"');
    return null;
  }
  if (!departDate) {
    printError('Need check-in date. Try: "hotels in Athens August 1–8"');
    return null;
  }
  const checkOut = returnDate || departDate;

  process.stdout.write(chalk.gray(`  Searching hotels in ${cityName}...`));
  let hotels;
  try {
    hotels = await searchHotels({ city: cityName, checkIn: departDate, checkOut, adults: adults || 2, maxPrice: budget });
    process.stdout.write('\r' + ' '.repeat(50) + '\r');
  } catch (e) {
    process.stdout.write('\r' + ' '.repeat(50) + '\r');
    printError(e.message);
    return null;
  }

  if (!hotels.length) {
    console.log(chalk.yellow(`  No hotels found in ${cityName} for those dates.\n`));
    return null;
  }

  console.log(chalk.bold(`\n  Hotels in ${cityName}  ${departDate} → ${checkOut}\n`));
  hotels.slice(0, 8).forEach((h, i) => {
    const stars  = h.stars ? '★'.repeat(Math.min(h.stars, 5)) : '';
    const rating = h.rating ? chalk.yellow(` ${h.rating}⭐`) : '';
    const total  = chalk.bold.magenta(` ($${h.totalPrice} total)`);
    console.log(
      `  ${chalk.bold(String(i + 1).padStart(2))}. ` +
      `${chalk.bold.green(`$${h.pricePerNight}/night`.padEnd(12))}  ` +
      `${chalk.white(h.name.slice(0, 30).padEnd(32))}  ` +
      `${chalk.gray(stars)}${rating}${total}`
    );
  });
  console.log('');
  return hotels;
}

async function runSpecificSearch(params) {
  const confirmed = await confirmParams(params);
  if (!confirmed) {
    console.log(chalk.gray('  OK, try again with more detail.\n'));
    return null;
  }

  // Connection mode: search via hubs (two separate tickets)
  if (params.connectionMode) {
    console.log('');
    process.stdout.write(chalk.gray(`  Searching hub connections...`));
    let directFlights = [];
    let connections = [];

    try {
      [directFlights, connections] = await Promise.all([
        searchFlights(params).catch(() => []),
        searchViaHubs(params, params.preferredHub || null),
      ]);
      process.stdout.write('\r' + ' '.repeat(50) + '\r');
    } catch (e) {
      process.stdout.write('\r' + ' '.repeat(50) + '\r');
      printError(e.message);
      return null;
    }

    const directBest = directFlights.length
      ? Math.min(...directFlights.map(f => f.price))
      : null;

    if (directBest) {
      console.log(chalk.gray(`  Direct best: ${chalk.green('$' + directBest)}\n`));
    }
    printConnectionResults(connections, directBest);
    return { connections };
  }

  // Standard specific-route search
  const mode = await pickSortMode();
  console.log('');

  let flights;
  try {
    process.stdout.write(chalk.gray('  Searching...'));
    flights = await searchFlights(params);
    process.stdout.write('\r' + ' '.repeat(40) + '\r');
  } catch (e) {
    printError(e.message);
    return null;
  }

  if (!flights.length) {
    console.log(chalk.yellow('  No direct flights found.'));
    const tryConnections = await ask(chalk.gray('  Search via hubs instead? [y/n] > '));
    if (tryConnections.trim().toLowerCase() === 'y') {
      process.stdout.write(chalk.gray('  Searching hub connections...'));
      const connections = await searchViaHubs(params).catch(() => []);
      process.stdout.write('\r' + ' '.repeat(50) + '\r');
      printConnectionResults(connections, null);
      return { connections };
    }
    return null;
  }

  const ranked = rankFlights(flights, mode);
  printResults(ranked, mode, params);
  return { flights, mode };
}

async function main() {
  if (!process.env.SERPAPI_KEY) {
    console.log(chalk.red('\n  Missing SERPAPI_KEY in .env\n'));
    process.exit(1);
  }

  printBanner();
  runHealthCheck().catch(() => {}); // fire-and-forget, non-blocking

  while (true) {
    const query = (await ask(chalk.bold.cyan('  > '))).trim();

    if (!query || ['exit', 'quit', 'q'].includes(query.toLowerCase())) {
      console.log(chalk.gray('\n  Bye.\n'));
      rl.close();
      break;
    }

    let params;
    try {
      process.stdout.write(chalk.gray('  Parsing...'));
      params = await parseQuery(query);
      process.stdout.write('\r' + ' '.repeat(20) + '\r');
    } catch (e) {
      printError(`Could not understand: ${e.message}`);
      continue;
    }

    // Calendar sweep: "cheapest day to fly TLV→Rome in June"
    if (params.calendarSweep && params.origin && params.destination) {
      const results = await calendarSweep({
        origin: params.origin || 'TLV',
        destination: params.destination,
        monthStr: params.sweepMonth || null,
        adults: params.adults || 1,
        tripType: params.tripType || 'roundtrip',
        stayDays: 7,
      }).catch(e => { printError(e.message); return []; });
      printCalendarResults(results, params.origin || 'TLV', params.destination);
      const next = (await ask(chalk.gray('  [n] new search  [q] quit  > '))).trim().toLowerCase();
      if (next === 'q') { console.log(chalk.gray('\n  Bye.\n')); rl.close(); process.exit(0); }
      continue;
    }

    // Hotel-only mode with specific destination
    if (params.mode === 'hotels') {
      await runHotelSearch(params);
      const next = (await ask(chalk.gray('  [n] new search  [q] quit  > '))).trim().toLowerCase();
      if (next === 'q') { console.log(chalk.gray('\n  Bye.\n')); rl.close(); process.exit(0); }
      continue;
    }

    // Budget scan: no destination OR budget with no specific destination (flights or whole trip)
    const isBudgetScan = !params.destination || (params.budget && !params.destination);
    if (isBudgetScan) {
      if (!params.departDate) {
        printError('Need at least a departure date. Try: "anywhere under $300 next weekend"');
        continue;
      }
      if (!params.returnDate) params.returnDate = params.departDate;
      await runBudgetScan(params);

      const next = (await ask(chalk.gray('  [n] new search  [q] quit  > '))).trim().toLowerCase();
      if (next === 'q') { console.log(chalk.gray('\n  Bye.\n')); rl.close(); process.exit(0); }
      continue;
    }

    // Default origin if missing
    if (!params.origin) params.origin = 'TLV';

    const result = await runSpecificSearch(params);
    if (!result) continue;

    // Re-sort only applies to direct flight results
    if (result.flights) {
      let { flights, mode } = result;
      while (true) {
        const next = (await ask(chalk.gray('  [r] re-sort  [c] hub connections  [n] new  [q] quit  > '))).trim().toLowerCase();
        if (next === 'r') {
          mode = await pickSortMode();
          console.log('');
          printResults(rankFlights(flights, mode), mode, params);
        } else if (next === 'c') {
          process.stdout.write(chalk.gray('  Searching hub connections...'));
          const connections = await searchViaHubs(params).catch(() => []);
          process.stdout.write('\r' + ' '.repeat(50) + '\r');
          const directBest = Math.min(...flights.map(f => f.price));
          printConnectionResults(connections, directBest);
        } else if (next === 'q') {
          console.log(chalk.gray('\n  Bye.\n'));
          rl.close();
          process.exit(0);
        } else {
          break;
        }
      }
    }
  }
}

main().catch(e => {
  console.error(chalk.red(`Fatal: ${e.message}`));
  process.exit(1);
});
