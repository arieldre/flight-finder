import 'dotenv/config';
import readline from 'readline';
import chalk from 'chalk';
import { parseQuery } from './lib/parser.js';
import { searchFlights } from './lib/search.js';
import { rankFlights, filterGarbage } from './lib/rank.js';
import { printBanner, printParsed, printResults, printError } from './lib/display.js';
import { budgetScan, printBudgetResults } from './lib/budget-scan.js';

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
  const rt = params.returnDate ? ` → ${params.returnDate}` : '';
  const ans = await ask(
    chalk.gray(`  Parsed: ${params.origin} → ${params.destination}, ${params.departDate}${rt}, ${params.adults} adult(s). Correct? `) +
    chalk.cyan('[y/n] > ')
  );
  return ans.trim().toLowerCase() !== 'n';
}

async function runBudgetScan(params) {
  const { budget, departDate, returnDate, tripType, adults, flexible } = params;
  const dates = flexible ? 'date ±1 day' : departDate;
  const combos = flexible ? '3 date combos' : '1 date';
  process.stdout.write(chalk.gray(`  Scanning 8 clusters × ${combos} from TLV + HFA (cached 6h)...`));

  let results;
  try {
    results = await budgetScan({ departDate, returnDate, tripType, adults, budget, flexible });
    process.stdout.write('\r' + ' '.repeat(70) + '\r');
  } catch (e) {
    process.stdout.write('\r' + ' '.repeat(70) + '\r');
    printError(e.message);
    return null;
  }

  printBudgetResults(results, budget || Infinity);
  return results;
}

async function runSpecificSearch(params) {
  const confirmed = await confirmParams(params);
  if (!confirmed) {
    console.log(chalk.gray('  OK, try again with more detail.\n'));
    return null;
  }

  const mode = await pickSortMode();
  console.log('');

  let flights;
  try {
    process.stdout.write(chalk.gray('  Searching Google Flights...'));
    flights = await searchFlights(params);
    process.stdout.write('\r' + ' '.repeat(40) + '\r');
  } catch (e) {
    printError(e.message);
    return null;
  }

  const ranked = rankFlights(flights, mode);
  printResults(ranked, mode, params);
  return { flights, mode };
}

async function main() {
  if (!process.env.SERPAPI_KEY) {
    console.log(chalk.red('\n  Missing SERPAPI_KEY in .env — get a free key at serpapi.com\n'));
    process.exit(1);
  }

  printBanner();

  while (true) {
    const query = (await ask(chalk.bold.cyan('  > '))).trim();

    if (!query || query.toLowerCase() === 'exit' || query.toLowerCase() === 'quit') {
      console.log(chalk.gray('\n  Bye.\n'));
      rl.close();
      break;
    }

    // Parse natural language
    let params;
    try {
      process.stdout.write(chalk.gray('  Parsing...'));
      params = await parseQuery(query);
      process.stdout.write('\r' + ' '.repeat(20) + '\r');
    } catch (e) {
      printError(`Could not understand query: ${e.message}`);
      continue;
    }

    // BUDGET SCAN MODE: no destination or budget specified → broad parallel scan
    const isBudgetScan = !params.destination || params.budget;
    if (isBudgetScan) {
      if (!params.departDate) {
        printError('Need at least a departure date. Try: "anywhere under $300 next weekend"');
        continue;
      }
      if (!params.returnDate) params.returnDate = params.departDate;
      await runBudgetScan(params);

      while (true) {
        const next = (await ask(chalk.gray('  [n] new search  [q] quit  > '))).trim().toLowerCase();
        if (next === 'q') { console.log(chalk.gray('\n  Bye.\n')); rl.close(); process.exit(0); }
        break;
      }
      continue;
    }

    // SPECIFIC ROUTE MODE
    const result = await runSpecificSearch(params);
    if (!result) continue;

    const { flights } = result;
    let { mode } = result;

    // Re-sort option
    while (true) {
      const next = (await ask(chalk.gray('  [r] re-sort  [n] new search  [q] quit  > '))).trim().toLowerCase();
      if (next === 'r') {
        mode = await pickSortMode();
        console.log('');
        printResults(rankFlights(flights, mode), mode, params);
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

main().catch(e => {
  console.error(chalk.red(`Fatal: ${e.message}`));
  process.exit(1);
});
