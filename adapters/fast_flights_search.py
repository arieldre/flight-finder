"""
fast-flights adapter — no API key required.
Reverse-engineers Google Flights protobuf. MIT license.
Usage: python adapters/fast_flights_search.py <JSON_ARGS_ON_STDIN>
Input:  {"from":"TLV","to":"NRT","date":"2026-08-22","returnDate":"2026-09-21","adults":1,"trip":"roundtrip","maxStops":2}
Output: JSON array of normalized flights to stdout
"""
import sys, json, re

import os, warnings
warnings.filterwarnings("ignore")
# Redirect primp's Impersonate warning from stdout to stderr
os.environ.setdefault('RUST_LOG', 'error')

from fast_flights import FlightData, Passengers, get_flights

def parse_duration_minutes(s):
    if not s:
        return None
    h = re.search(r'(\d+)\s*hr', s)
    m = re.search(r'(\d+)\s*min', s)
    return (int(h.group(1)) if h else 0) * 60 + (int(m.group(1)) if m else 0)

def parse_price_ils(s):
    if not s:
        return None
    digits = re.sub(r'[^\d.]', '', str(s))
    try:
        return float(digits)
    except:
        return None

def ils_to_usd(ils, rate=0.2740):
    # ~3.65 ILS/USD as of 2026-05. Rate can be overridden.
    if ils is None:
        return None
    return round(ils * rate)

def parse_time(s):
    # "3:05 PM on Sat, Aug 22" → "15:05"
    if not s:
        return ''
    m = re.search(r'(\d+:\d+)\s*(AM|PM)', s)
    if not m:
        return s[:8]
    t, meridiem = m.group(1), m.group(2)
    h, mn = t.split(':')
    h = int(h)
    if meridiem == 'PM' and h != 12:
        h += 12
    elif meridiem == 'AM' and h == 12:
        h = 0
    return f"{h:02d}:{mn}"

def main():
    raw = sys.stdin.read().strip()
    args = json.loads(raw) if raw else {}

    origin      = args.get('from', 'TLV')
    destination = args.get('to', 'NRT')
    date        = args.get('date', '')
    return_date = args.get('returnDate')
    adults      = int(args.get('adults', 1))
    trip        = args.get('trip', 'roundtrip')
    max_stops   = int(args.get('maxStops', 2))
    ils_rate    = float(args.get('ilsRate', 0.2740))

    def fetch_leg(from_iata, to_iata, leg_date):
        fd = [FlightData(date=leg_date, from_airport=from_iata, to_airport=to_iata)]
        result = get_flights(
            flight_data=fd,
            trip='one-way',
            seat='economy',
            passengers=Passengers(adults=adults),
            max_stops=max_stops,
        )
        return result.flights or []

    # For roundtrip: fetch both legs separately, combine cheapest return onto each outbound.
    # fast-flights round-trip mode returns one combined result with no timing details.
    try:
        outbound_flights = fetch_leg(origin, destination, date)
    except Exception as e:
        json.dump({"error": str(e)}, sys.stdout)
        return

    return_cheapest_ils = None
    if trip == 'round-trip' and return_date:
        try:
            return_flights = fetch_leg(destination, origin, return_date)
            valid_ret = [f for f in return_flights if f.name and parse_price_ils(f.price)]
            if valid_ret:
                return_cheapest_ils = min(parse_price_ils(f.price) for f in valid_ret)
        except Exception:
            pass  # no return data — fall back to outbound only

    flights = []
    seen = set()

    for f in outbound_flights:
        if not f.name:
            continue

        price_ils = parse_price_ils(f.price)
        if price_ils is None:
            continue

        # Add cheapest return leg for roundtrip total
        if return_cheapest_ils is not None:
            total_ils = price_ils + return_cheapest_ils
        else:
            total_ils = price_ils

        price_usd = ils_to_usd(total_ils, ils_rate)
        dur_min   = parse_duration_minutes(f.duration)
        dep_time  = parse_time(f.departure)
        arr_time  = parse_time(f.arrival)

        key = (f.name, dep_time, str(f.stops))
        if key in seen:
            continue
        seen.add(key)

        flights.append({
            "price":            price_usd,
            "price_ils":        total_ils,
            "totalDuration":    dur_min,
            "stops":            f.stops if isinstance(f.stops, int) else -1,
            "airline":          f.name or '',
            "departure":        dep_time,
            "arrival":          arr_time,
            "departureAirport": origin,
            "arrivalAirport":   destination,
            "layovers":         [],
            "isBest":           bool(f.is_best),
            "typicalLow":       None,
            "typicalHigh":      None,
            "source":           "fast-flights",
            "isRoundtrip":      return_cheapest_ils is not None,
        })

    json.dump(flights, sys.stdout, ensure_ascii=False)

if __name__ == '__main__':
    main()
