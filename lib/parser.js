import Groq from 'groq-sdk';

// Lazy init — avoid crash at module load when key is absent (BP-045)
let _client = null;
function getClient() {
  if (!_client) _client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return _client;
}

const TODAY = new Date().toISOString().slice(0, 10);

export async function parseQuery(query) {
  const completion = await getClient().chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 300,
    temperature: 0,
    messages: [
      {
        role: 'system',
        content: `Extract flight search parameters from natural language. Return ONLY valid JSON, no explanation.
Today is ${TODAY}.
Output schema: { "origin": "IATA or null", "destination": "IATA or null", "departDate": "YYYY-MM-DD", "returnDate": "YYYY-MM-DD or null", "adults": 1, "tripType": "roundtrip|oneway", "budget": null, "flexible": false, "connectionMode": false, "preferredHub": "IATA or null" }
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
- sweepMonth: if calendarSweep is true, extract the month string e.g. "June 2026", "July", "next month". null if not mentioned.
- If something is ambiguous, make a reasonable assumption`,
      },
      { role: 'user', content: query },
    ],
  });

  const text = completion.choices[0].message.content.trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`Could not parse: ${text}`);
  return JSON.parse(jsonMatch[0]);
}
