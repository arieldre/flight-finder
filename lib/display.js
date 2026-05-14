import chalk from 'chalk';
import { formatDuration } from './rank.js';

export function printBanner() {
  console.log(chalk.bold.cyan('\n  Flight Agent'));
  console.log(chalk.gray('  Type your search in plain English. Examples:'));
  console.log(chalk.gray('    "flights from TLV to London next weekend"'));
  console.log(chalk.gray('    "one way NYC to Paris July 20, 2 adults"'));
  console.log(chalk.gray('    "cheapest TLV to JFK in August"\n'));
}

export function printParsed(params) {
  const rt = params.returnDate ? ` → ${params.returnDate}` : '';
  const pax = params.adults > 1 ? `, ${params.adults} adults` : '';
  const type = params.tripType === 'oneway' ? ' (one-way)' : '';
  console.log(chalk.yellow(`\n  Searching: ${params.origin} → ${params.destination}  |  ${params.departDate}${rt}${pax}${type}\n`));
}

export function printResults(flights, mode, params) {
  if (flights.length === 0) {
    console.log(chalk.red('  No flights found. Try different dates or airports.\n'));
    return;
  }

  const label = { cheapest: 'CHEAPEST', fastest: 'FASTEST', best: 'BEST' }[mode];
  console.log(chalk.bold(`\n  Top results — sorted by ${label}\n`));

  const top = flights.slice(0, 5);

  top.forEach((f, i) => {
    const stopsLabel = f.stops === 0 ? chalk.green('Direct') :
      f.stops === 1 ? chalk.yellow(`1 stop`) :
      chalk.red(`${f.stops} stops`);

    const price = chalk.bold.green(`$${f.price}`);
    const dur = chalk.cyan(formatDuration(f.totalDuration));
    const airline = chalk.white(f.airline || 'Unknown airline');
    const times = f.departure && f.arrival ? chalk.gray(` ${f.departure} → ${f.arrival}`) : '';
    const layover = f.layovers?.length ? chalk.gray(` via ${f.layovers.join(', ')}`) : '';
    const best = f.isBest ? chalk.bold.magenta(' ★') : '';

    console.log(`  ${chalk.bold(i + 1)}. ${price}  ${dur}  ${stopsLabel}  ${airline}${times}${layover}${best}`);
  });

  if (flights.length > 5) {
    console.log(chalk.gray(`\n  ... and ${flights.length - 5} more options`));
  }
  console.log('');
}

export function printError(msg) {
  console.log(chalk.red(`\n  Error: ${msg}\n`));
}
