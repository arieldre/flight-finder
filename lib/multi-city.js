import { searchFlights } from './search.js';
import chalk from 'chalk';

/**
 * Search each leg independently. Returns array of leg results.
 * legs: [{origin, destination, date}]
 */
export async function searchMultiCity({ legs, adults = 1 }) {
  if (!Array.isArray(legs) || legs.length < 2) {
    throw new Error('Multi-city requires at least 2 legs');
  }

  const results = await Promise.allSettled(
    legs.map(leg =>
      searchFlights({
        origin:      leg.origin,
        destination: leg.destination,
        departDate:  leg.date,
        returnDate:  null,
        adults,
        tripType:    'oneway',
      }, 'live')
    )
  );

  return legs.map((leg, i) => {
    const r = results[i];
    const flights = r.status === 'fulfilled' ? r.value : [];
    const cheapest = flights.length
      ? flights.reduce((min, f) => f.price < min.price ? f : min, flights[0])
      : null;
    return { leg, flights, cheapest, error: r.status === 'rejected' ? r.reason?.message : null };
  });
}

export function printMultiCityResults(legResults, adults) {
  const allFound = legResults.every(r => r.cheapest);
  const total = allFound
    ? legResults.reduce((sum, r) => sum + r.cheapest.price, 0)
    : null;

  console.log(chalk.bold('\n  Multi-city itinerary\n'));

  legResults.forEach((r, i) => {
    const { leg, cheapest, error } = r;
    const label = `  Leg ${i + 1}  ${leg.origin} -> ${leg.destination}  ${leg.date}`;

    if (error || !cheapest) {
      console.log(chalk.red(`${label}  -- no results${error ? ': ' + error : ''}`));
      return;
    }

    const stops   = cheapest.stops === 0 ? chalk.green('direct') : chalk.yellow(`${cheapest.stops} stop`);
    const airline = cheapest.airline ? chalk.gray(` ${cheapest.airline}`) : '';
    const dur     = cheapest.totalDuration ? chalk.gray(` ${Math.floor(cheapest.totalDuration / 60)}h${cheapest.totalDuration % 60}m`) : '';
    console.log(
      `${chalk.bold(label)}` +
      `  ${chalk.bold.green('$' + cheapest.price)}  ${stops}${airline}${dur}`
    );
  });

  if (total !== null) {
    const perPax = adults > 1 ? chalk.gray(`  ($${Math.round(total / adults)}/person)`) : '';
    console.log(chalk.bold(`\n  Total: ${chalk.bold.magenta('$' + total)}${perPax}`));
  } else {
    console.log(chalk.yellow('\n  Some legs had no results — total unavailable.'));
  }
  console.log('');
}
