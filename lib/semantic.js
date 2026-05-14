import Groq from 'groq-sdk';

// Lazy init — same pattern as parser.js (BP-045)
let _client = null;
function getClient() {
  if (!_client) _client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return _client;
}

const VALID_TAGS = new Set(['beach', 'city', 'mountains', 'ski', 'nature', 'party', 'culture', 'islands']);

/**
 * Detect semantic travel type filters from a raw query string.
 * Returns { tags: string[], hasSemanticFilter: boolean }.
 * Fails open — on any error returns empty tags so budget scan runs normally.
 */
export async function detectSemanticFilter(query) {
  try {
    const safeQuery = String(query).slice(0, 500);

    const completion = await getClient().chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 100,
      temperature: 0,
      messages: [
        {
          role: 'system',
          content: `Extract travel type tags from a user query. Return ONLY valid JSON, no explanation.
Output schema: { "tags": string[], "hasSemanticFilter": boolean }
Valid tags: beach, city, mountains, ski, nature, party, culture, islands
Rules:
- tags: list of matching travel types implied by the query
- hasSemanticFilter: true if the query mentions a travel type/vibe (beach, city break, skiing, etc.)
- hasSemanticFilter: false if the query is a specific route or destination with no type tag (e.g. "flights to Rome", "TLV to Paris next week")
- A query can match multiple tags (e.g. "island beach party" → ["beach","islands","party"])
- "ski" and "skiing" → ["ski","mountains"]
- "city break" or "city trip" → ["city"]
- "nature" or "outdoor" → ["nature"]
- Budget/date constraints do not affect hasSemanticFilter`,
        },
        { role: 'user', content: safeQuery },
      ],
    });

    const text = completion.choices[0].message.content.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { tags: [], hasSemanticFilter: false };

    const parsed = JSON.parse(jsonMatch[0]);
    const tags = Array.isArray(parsed.tags)
      ? parsed.tags.filter(t => VALID_TAGS.has(t))
      : [];
    const hasSemanticFilter = !!parsed.hasSemanticFilter && tags.length > 0;

    return { tags, hasSemanticFilter };
  } catch {
    // Fail open — don't crash budget scan on Groq errors
    return { tags: [], hasSemanticFilter: false };
  }
}
