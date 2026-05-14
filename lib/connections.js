import { searchFlights } from './search.js';
import chalk from 'chalk';
import { formatDuration } from './rank.js';

// Major hubs Israeli travellers use for onward connections.
// minLayover = minimum realistic transfer time in minutes.
export const HUBS = [
  { iata: 'IST', name: 'Istanbul',   minLayover: 75  },  // Turkish Airlines — highest frequency
  { iata: 'DXB', name: 'Dubai',      minLayover: 90  },  // Emirates — Asia/Africa
  { iata: 'AMS', name: 'Amsterdam',  minLayover: 45  },  // KLM — North America
  { iata: 'FRA', name: 'Frankfurt',  minLayover: 60  },  // Lufthansa — Americas/Asia
  { iata: 'CDG', name: 'Paris',      minLayover: 75  },  // Air France — Africa
  { iata: 'LHR', name: 'London',     minLayover: 90  },  // BA — long-haul
  { iata: 'FCO', name: 'Rome',       minLayover: 60  },  // ITA — Southern routes
];

// Search origin → destination via each hub as two separate tickets.
// Returns array of combined itineraries sorted by total price.
// IMPORTANT: these are self-transfer itineraries — separate tickets.
export async function searchViaHubs({ origin, destination, departDate, returnDate, adults, tripType }, preferredHub = null) {
  const hubs = preferredHub
    ? HUBS.filter(h => h.iata === preferredHub)
    : HUBS;

  const searches = await Promise.allSettled(
    hubs.map(async hub => {
      const [leg1flights, leg2flights] = await Promise.all([
        searchFlights(
          { origin, destination: hub.iata, departDate, adults, tripType: 'oneway' },
          'budget'
        ),
        searchFlights(
          { origin: hub.iata, destination, departDate, adults, tripType: 'oneway' },
          'budget'
        ),
      ]);

      if (!leg1flights.length || !leg2flights.length) return null;

      const leg1 = [...leg1flights].sort((a, b) => a.price - b.price)[0];
      const leg2 = [...leg2flights].sort((a, b) => a.price - b.price)[0];
      if (!leg1.price || !leg2.price) return null;

      return {
        hub,
        leg1,
        leg2,
        totalPrice:    leg1.price + leg2.price,
        totalDuration: leg1.totalDuration + hub.minLayover + leg2.totalDuration,
        isSelfTransfer: true,
      };
    })
  );

  return searches
    .filter(r => r.status === 'fulfilled' && r.value)
    .map(r => r.value)
    .sort((a, b) => a.totalPrice - b.totalPrice);
}

export function printConnectionResults(connections, directPrice = null) {
  if (!connections.length) {
    console.log(chalk.gray('  No hub connections found.\n'));
    return;
  }

  console.log(chalk.bold('\n  Hub connections (2 separate tickets)\n'));
  console.log(chalk.yellow('  ⚠  Self-transfer: missed connection = stranded. Book with buffer time.\n'));

  connections.slice(0, 5).forEach((c, i) => {
    const savings = directPrice ? directPrice - c.totalPrice : null;
    const savingsStr = savings > 0
      ? chalk.green(` save $${savings}`)
      : savings < 0
      ? chalk.red(` +$${Math.abs(savings)} vs direct`)
      : '';

    const dur = formatDuration(c.totalDuration);

    console.log(
      `  ${chalk.bold(i + 1)}. ` +
      `${chalk.bold.green(`$${c.totalPrice}`)}${savingsStr}  ` +
      `via ${chalk.cyan(c.hub.name)}  ` +
      `${chalk.gray(dur)}`
    );
    console.log(
      `       Leg 1: $${c.leg1.price} ${c.leg1.airline} ${formatDuration(c.leg1.totalDuration)}` +
      `  →  Leg 2: $${c.leg2.price} ${c.leg2.airline} ${formatDuration(c.leg2.totalDuration)}`
    );
  });

  console.log('');
}
