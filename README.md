# Flight Finder

Local CLI + MCP server for flight and hotel search. No booking fees. Zero API key required for flights and hotels — uses fast-flights (Google Flights reverse-engineer) and Playwright.

## Requirements

- Node.js 18+
- Python 3.10+ with `playwright` (`pip install playwright && playwright install chromium`)
- `npm install`

## Setup

```
cp .env.example .env
```

`.env` values:

| Key | Required | Purpose |
|-----|----------|---------|
| `GROQ_API_KEY` | Yes | NLP query parsing (free tier at console.groq.com) |
| `SERPAPI_KEY` | No | Fallback flight search if fast-flights fails |
| `SCAN_CONCURRENCY` | No | Budget-scan workers (default 10, max 20) |
| `PYTHON_BIN` | No | Python binary path (default: `python` on Windows, `python3` elsewhere) |

## CLI

```
node index.js
```

### Flight search

```
> TLV to Athens August 5 return August 12
> fly from Tel Aviv to London next Friday one way
> TLV to Rome, 2 adults, under $400
```

### Budget scan (anywhere mode)

```
> anywhere under $300 next weekend
> beach destinations under $400 in July        (semantic tag filter)
> flights under $500 next month with hotels    (trip mode — flight + hotel total)
```

### Calendar sweep

```
> cheapest day to fly TLV to Barcelona in June
> cheapest week TLV to Rome in August
```

### Hub connections

```
> TLV to Tokyo via Istanbul
> fly to Seoul through Dubai
```

### Multi-city

```
> fly TLV to Rome Aug 1, Rome to Barcelona Aug 6, Barcelona to TLV Aug 10
> multi-city TLV->LHR->CDG->TLV in September
```

### Hotels only

```
> hotels in Athens August 1 to 8
> find me a hotel in Barcelona next weekend 2 adults
```

### Price alerts

```
> alert me when TLV to Athens drops below $150
> list alerts
> delete alert 3
> reset alert 3          (re-arm a triggered alert)
> clear triggered alerts (remove all fired alerts)
```

Alerts fire on startup (against price history) and after every search on that route.

## MCP Server

Exposes `search_flights` and `search_hotels` tools for Claude Desktop or any MCP client.

```
node mcp-server.js
```

Claude Desktop config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "flight-finder": {
      "command": "node",
      "args": ["C:/path/to/flight-agent/mcp-server.js"],
      "env": {
        "GROQ_API_KEY": "...",
        "SERPAPI_KEY": "..."
      }
    }
  }
}
```

Rate limit: 10 calls/60s, max 3 concurrent.

## Data

- Flights: fast-flights (free, no key) → SerpAPI fallback
- Hotels: Playwright scraping Google Hotels (free, no key) → SerpAPI fallback
- Cache: SQLite at `~/.flight-agent/db.sqlite` (15 min live, 6h hotels, 24h budget)
- Price history + alerts: same SQLite DB

## Architecture

```
index.js          CLI entry — NLP parse → route → display
lib/
  parser.js       Groq LLM — natural language → structured params
  search.js       Flights — fast-flights + SerpAPI fallback + cache
  budget-scan.js  Parallel airport sweep — semantic filter + jitter
  calendar-sweep.js  Cheapest day / cheapest 7-day window
  multi-city.js   Multi-leg itinerary — parallel per-leg search
  alerts.js       Price alert store — SQLite, history + live fire
  connections.js  Hub routing — two-ticket connections via hubs
  destinations.js 130+ destinations with tags, visa data, clusters
  semantic.js     Tag extraction — "beach under $400" → {tags}
  health-check.js Startup canary — TLV->ATH sanity check
adapters/
  fast-flights.js    Python subprocess — Google Flights, zero key
  fast_flights_search.py
  hotels.js          Playwright orchestration + SerpAPI fallback
  fast_hotels_search.py
mcp-server.js     MCP stdio server — search_flights + search_hotels
```
