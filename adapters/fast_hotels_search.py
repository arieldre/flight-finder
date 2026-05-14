"""
Google Hotels scraper — zero API key, no quota limits.
Uses Playwright (local chromium) to render the page.
Selectors: jscontroller attributes (framework-tied, survive CSS rotation).
Usage: python adapters/fast_hotels_search.py <JSON_ARGS_ON_STDIN>
Input:  {"city":"Athens","checkIn":"2026-08-01","checkOut":"2026-08-08","adults":2,"ilsRate":0.274}
Output: JSON array of hotels to stdout
"""
import sys, json, re, asyncio, os, warnings
warnings.filterwarnings("ignore")

CURRENCY_RE = re.compile(r"[₪$€£](\d[\d,]+)")
RATING_RE   = re.compile(r"(\d\.\d)\s*/\s*5")
STARS_RE    = re.compile(r"(\d)-star")

def parse_price(text, ils_rate):
    """Return (price_usd, price_local, currency_symbol) from card inner text."""
    for line in text.split("\n"):
        m = CURRENCY_RE.search(line)
        if m:
            raw = int(m.group(1).replace(",", ""))
            symbol = m.group(0)[0]
            if symbol == "₪":
                return round(raw * ils_rate), raw, "ILS"
            elif symbol == "$":
                return raw, raw, "USD"
            elif symbol == "€":
                return round(raw * 1.08), raw, "EUR"
            elif symbol == "£":
                return round(raw * 1.27), raw, "GBP"
    return None, None, None

def parse_rating(text):
    m = RATING_RE.search(text)
    return float(m.group(1)) if m else None

def parse_stars(text):
    m = STARS_RE.search(text)
    return int(m.group(1)) if m else None

async def scrape_hotels(city, check_in, check_out, adults, ils_rate, limit=20):
    from playwright.async_api import async_playwright

    slug = city.lower().replace(" ", "-")
    url = (
        f"https://www.google.com/travel/hotels/{slug}"
        f"?hl=en&curr=USD&checkin={check_in}&checkout={check_out}&adults={adults}"
    )

    hotels = []
    seen = set()

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(
            locale="en-US",
            # Force US locale so prices render in USD where possible
            extra_http_headers={"Accept-Language": "en-US,en;q=0.9"},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
        )
        page = await ctx.new_page()

        try:
            await page.goto(url, wait_until="networkidle", timeout=35000)
        except Exception:
            pass  # networkidle may time out on heavy pages — proceed with what loaded

        def _extract_cards(elements_text):
            for text in elements_text:
                if not text.strip():
                    continue
                lines = [l.strip() for l in text.split("\n") if l.strip()]
                if not lines:
                    continue
                name = lines[0]
                if len(name) < 3 or len(name) > 100:
                    continue
                key = name.lower()
                if key in seen:
                    continue
                price_usd, price_local, currency = parse_price(text, ils_rate)
                if not price_usd:
                    continue
                seen.add(key)
                hotels.append({
                    "name":        name,
                    "price":       price_usd,
                    "priceLocal":  price_local,
                    "currency":    currency,
                    "rating":      parse_rating(text),
                    "stars":       parse_stars(text),
                    "source":      "playwright-hotels",
                })

        # Sponsored cards (top of listing)
        els = await page.query_selector_all('li[jscontroller="RWo9af"]')
        texts = [await el.inner_text() for el in els]
        _extract_cards(texts)

        # Organic listing cards
        if len(hotels) < limit:
            els = await page.query_selector_all('div[jscontroller="rqWJpd"]')
            texts = [await el.inner_text() for el in els]
            _extract_cards(texts)

        # Fallback: accessibility snapshot map-pin pattern "Name, ₪NNN"
        if len(hotels) < 5:
            snapshot_text = await page.evaluate("() => document.body.innerText")
            lines = [l.strip() for l in snapshot_text.split("\n") if l.strip()]
            for i in range(len(lines) - 1):
                name = lines[i]
                m = CURRENCY_RE.search(lines[i + 1])
                if m and 3 < len(name) < 80 and not CURRENCY_RE.search(name):
                    raw = int(m.group(1).replace(",", ""))
                    sym = m.group(0)[0]
                    price_usd = round(raw * ils_rate) if sym == "₪" else raw
                    key = name.lower()
                    if key not in seen and price_usd:
                        seen.add(key)
                        hotels.append({
                            "name":       name,
                            "price":      price_usd,
                            "priceLocal": raw,
                            "currency":   "ILS" if sym == "₪" else "USD",
                            "rating":     None,
                            "stars":      None,
                            "source":     "playwright-hotels-fallback",
                        })
                if len(hotels) >= limit:
                    break

        await browser.close()

    return hotels[:limit]

def main():
    raw = sys.stdin.read().strip()
    args = json.loads(raw) if raw else {}

    city      = args.get("city", "Athens")
    check_in  = args.get("checkIn", "")
    check_out = args.get("checkOut", "")
    adults    = int(args.get("adults", 2))
    ils_rate  = float(args.get("ilsRate", 0.274))
    limit     = int(args.get("limit", 20))

    if not check_in or not check_out:
        json.dump({"error": "checkIn and checkOut required"}, sys.stdout)
        return

    try:
        hotels = asyncio.run(scrape_hotels(city, check_in, check_out, adults, ils_rate, limit))
    except Exception as e:
        json.dump({"error": str(e)}, sys.stdout)
        return

    try:
        from datetime import date
        nights = (date.fromisoformat(check_out) - date.fromisoformat(check_in)).days
    except Exception:
        nights = None

    for h in hotels:
        h["nights"]     = nights
        h["totalPrice"] = round(h["price"] * nights) if (h["price"] and nights) else None

    json.dump(hotels, sys.stdout, ensure_ascii=False)

if __name__ == "__main__":
    main()
