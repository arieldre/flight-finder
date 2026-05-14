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

    # round-trip mode returns 1 result with empty fields — use one-way for full details.
    # Prices shown are one-way (per direction); UI notes this clearly.
    flight_data = [FlightData(date=date, from_airport=origin, to_airport=destination)]

    try:
        result = get_flights(
            flight_data=flight_data,
            trip='one-way',
            seat='economy',
            passengers=Passengers(adults=adults),
            max_stops=max_stops,
        )
    except Exception as e:
        json.dump({"error": str(e)}, sys.stdout)
        return

    flights = []
    seen = set()

    for f in (result.flights or []):
        if not f.name:
            continue  # skip Google Flights phantom summary row (empty airline = price-only stub)

        price_ils = parse_price_ils(f.price)
        price_usd = ils_to_usd(price_ils, ils_rate)
        dur_min   = parse_duration_minutes(f.duration)
        dep_time  = parse_time(f.departure)
        arr_time  = parse_time(f.arrival)

        key = (f.name, dep_time, str(f.stops))
        if key in seen:
            continue
        seen.add(key)

        flights.append({
            "price":            price_usd,
            "price_ils":        price_ils,
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
            "isOneWay":         True,   # fast-flights one-way mode; multiply ~2 for roundtrip est.
        })

    json.dump(flights, sys.stdout, ensure_ascii=False)

if __name__ == '__main__':
    main()
