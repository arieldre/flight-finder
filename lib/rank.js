export function rankFlights(flights, mode) {
  if (flights.length === 0) return [];

  if (mode === 'cheapest') {
    return [...flights].sort((a, b) => a.price - b.price);
  }

  if (mode === 'fastest') {
    return [...flights].sort((a, b) => a.totalDuration - b.totalDuration);
  }

  // best = balanced score: 50% price, 30% duration, 20% stops
  const prices = flights.map(f => f.price).filter(Boolean);
  const durations = flights.map(f => f.totalDuration).filter(Boolean);

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const minDur = Math.min(...durations);
  const maxDur = Math.max(...durations);

  const normalize = (val, min, max) =>
    max === min ? 0 : (val - min) / (max - min);

  const stopsScore = (stops) => Math.min(stops / 2, 1);

  return [...flights]
    .map(f => ({
      ...f,
      _score:
        0.5 * normalize(f.price, minPrice, maxPrice) +
        0.3 * normalize(f.totalDuration, minDur, maxDur) +
        0.2 * stopsScore(f.stops),
    }))
    .sort((a, b) => a._score - b._score);
}

export function formatDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

// Drop flights with absurd layovers (duration > 2.5x typical direct)
export function filterGarbage(flights, typicalDirectMinutes) {
  const cap = typicalDirectMinutes ? typicalDirectMinutes * 2.5 : 480;
  return flights.filter(f => f.totalDuration <= cap);
}
