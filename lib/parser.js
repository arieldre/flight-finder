import Groq from 'groq-sdk';

// Lazy init — avoid crash at module load when key is absent (BP-045)
let _client = null;
function getClient() {
  if (!_client) _client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return _client;
}

const ALLOWED_MODES   = new Set(['flights', 'hotels', 'trip', 'multi-city']);
const ALLOWED_TYPES   = new Set(['roundtrip', 'oneway']);
const DATE_RE         = /^\d{4}-\d{2}-\d{2}$/;
const IATA_RE         = /^[A-Z]{3}$/;
const QUERY_MAX_LEN   = 500;

function validateParsed(obj) {
  if (typeof obj !== 'object' || obj === null) throw new Error('Parser returned non-object');
  if (obj.origin      && !IATA_RE.test(obj.origin))      obj.origin      = null;
  if (obj.destination && !IATA_RE.test(obj.destination)) obj.destination = null;
  if (obj.preferredHub && !IATA_RE.test(obj.preferredHub)) obj.preferredHub = null;
  if (obj.departDate  && !DATE_RE.test(obj.departDate))  obj.departDate  = null;
  if (obj.returnDate  && !DATE_RE.test(obj.returnDate))  obj.returnDate  = null;

  // Date range bounds: reject past dates and dates beyond 365 days out
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today); maxDate.setDate(maxDate.getDate() + 365);
  if (obj.departDate) {
    const d = new Date(obj.departDate);
    if (d < today || d > maxDate) obj.departDate = null;
  }
  if (obj.returnDate) {
    const d = new Date(obj.returnDate);
    if (d < today || d > maxDate) obj.returnDate = null;
  }
  // returnDate must not precede departDate
  if (obj.returnDate && obj.departDate && new Date(obj.returnDate) < new Date(obj.departDate)) {
    obj.returnDate = null;
  }

  if (!ALLOWED_MODES.has(obj.mode))   obj.mode     = 'flights';
  if (!ALLOWED_TYPES.has(obj.tripType)) obj.tripType = 'roundtrip';
  obj.adults  = Number.isInteger(obj.adults)  && obj.adults  >= 1 && obj.adults  <= 9  ? obj.adults  : 1;
  obj.budget  = typeof obj.budget  === 'number' && obj.budget  > 0 && obj.budget  < 100000 ? obj.budget  : null;
  obj.flexible        = !!obj.flexible;
  obj.connectionMode  = !!obj.connectionMode;
  obj.calendarSweep   = !!obj.calendarSweep;
  obj.weekSweep       = !!obj.weekSweep;
  obj.sweepMonth      = typeof obj.sweepMonth === 'string'
    ? obj.sweepMonth.replace(/[^\w\s]/g, '').slice(0, 30)
    : null;

  // Validate legs for multi-city mode
  if (obj.mode === 'multi-city' && Array.isArray(obj.legs)) {
    obj.legs = obj.legs
      .filter(l => typeof l === 'object' && l !== null)
      .map(l => ({
        origin:      IATA_RE.test(l.origin)      ? l.origin      : null,
        destination: IATA_RE.test(l.destination) ? l.destination : null,
        date:        DATE_RE.test(l.date)         ? l.date        : null,
      }))
      .filter(l => l.origin && l.destination && l.date)
      .slice(0, 6); // cap at 6 legs
    if (obj.legs.length < 2) obj.mode = 'flights'; // not enough legs → fall back
  } else {
    obj.legs = null;
  }

  return obj;
}

export async function parseQuery(query) {
  const safeQuery = String(query).slice(0, QUERY_MAX_LEN);
  const TODAY = new Date().toISOString().slice(0, 10);

  const completion = await getClient().chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 500,
    temperature: 0,
    messages: [
      {
        role: 'system',
        content: `Extract travel search parameters from natural language. Return ONLY valid JSON, no explanation.
Today is ${TODAY}.
Output schema: { "origin": "IATA or null", "destination": "IATA or null", "departDate": "YYYY-MM-DD", "returnDate": "YYYY-MM-DD or null", "adults": 1, "tripType": "roundtrip|oneway", "budget": null, "flexible": false, "connectionMode": false, "preferredHub": "IATA or null", "mode": "flights", "calendarSweep": false, "weekSweep": false, "sweepMonth": null, "legs": null }
Rules:
- Convert city names to main airport IATA (Tel Aviv→TLV, Haifa→HFA, New York→JFK, London→LHR, Paris→CDG, Tokyo→NRT, Bangkok→BKK, Singapore→SIN, Seoul→ICN, etc.)
- Relative dates: "next weekend" = upcoming Fri-Sun, "July 15" = 2026-07-15 if past current date
- adults defaults to 1 if not mentioned
- tripType = "roundtrip" if return date present, else "oneway"
- budget: extract max price if mentioned ("under $300", "max $300", "around $300" → 300). null if not mentioned
- flexible: true if user says "+-", "around", "flexible", "or so", "approximately" on dates
- destination: null if user says "anywhere", "somewhere", "any destination", or only specifies a region
- origin: null if not mentioned (system will search from TLV + HFA)
- connectionMode: true if user says "via", "through", "connecting", "hub", "connection", or asks to route through a specific city
- preferredHub: if user specifies a hub city (e.g. "via Istanbul" → "IST", "through Dubai" → "DXB", "via London" → "LHR"). null if not specified but connectionMode is true
- calendarSweep: true if user asks "cheapest day/week/month", "best day to fly", "when is cheapest", "cheapest in June" etc.
- weekSweep: true if user asks "cheapest week", "best week to fly", "cheapest 7 days". Also set calendarSweep: true when weekSweep is true.
- sweepMonth: if calendarSweep or weekSweep is true, extract the month string e.g. "June 2026", "July", "next month". null if not mentioned.
- mode: set to "hotels" if user asks only about hotels. Set to "trip" if user mentions both flight+hotel. Set to "multi-city" if user mentions multiple destinations in sequence, open-jaw, or says "multi-city". Default: "flights".
- legs: if mode is "multi-city", extract array of {origin, destination, date} objects — one per flight segment. Each leg's origin must equal previous leg's destination. If user doesn't specify a return leg, add final leg back to first origin on a reasonable date. null for all other modes.
- If something is ambiguous, make a reasonable assumption`,
      },
      { role: 'user', content: safeQuery },
    ],
  });

  const text = completion.choices[0].message.content.trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`Could not parse LLM response`);
  const parsed = validateParsed(JSON.parse(jsonMatch[0]));
  parsed.semanticQuery = safeQuery;
  return parsed;
}
