"""Checks the country shipping copy on a Shopify theme preview, country by country.

Expected copy comes from ops/shipping-country-display.json (the same data as the shop
metafield custom.shipping_country_display); country names come from Shopify's own country
selector on the page. Exit code 1 when any check fails.

Usage: python -I ops/check-country-copy.py [theme_id] [country ...]
"""

import html
import http.cookiejar
import json
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

# The myshopify domain redirects here and drops preview_theme_id, so a preview needs its cookie.
STORE = "https://ooraliving.com"
THEME_ID = sys.argv[1] if len(sys.argv) > 1 else "189428760670"
ONLY = set(sys.argv[2:])
THE = {"GB", "NL", "PH", "US"}
STALE = ["Free Shipping: US, UK, Canada", "orders $49", "$49 or more", "One daily ritual"]

config = json.loads((Path(__file__).parent / "shipping-country-display.json").read_text("utf-8"))
countries = config["countries"]
total = len(countries)


def get(url):
    for wait in (5, 15, 45, 0):
        try:
            with opener.open(url, timeout=60) as res:
                return res.read().decode("utf-8")
        except urllib.error.HTTPError as e:
            if e.code != 429 or not wait:
                raise
            time.sleep(wait)


opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
opener.addheaders = [("User-Agent", "Mozilla/5.0 (oora country copy check)")]
get(f"{STORE}/?preview_theme_id={THEME_ID}")


def fetch(path, code):
    page = get(f"{STORE}{path}?country={code}")
    served = re.search(r'Shopify\.theme = \{[^}]*"id":(\d+)', page)
    if not served or served.group(1) != THEME_ID:
        raise RuntimeError(f"{path} {code}: served theme {served and served.group(1)}, not {THEME_ID}")
    if f'Shopify.country = "{code}"' not in page:
        raise RuntimeError(f"{path} {code}: page did not switch to {code}")
    return html.unescape(page)


def text_of(page):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", page))


def display_name(page, code):
    match = re.search(rf'flags/{code.lower()}\.svg[^>]*alt="([^"]+)"', page)
    name = match.group(1) if match else code
    return f"the {name}" if code in THE else name


def expected_home(code, name):
    label = countries[code]["label"].replace("[country]", name)
    if label:
        benefit = label if label.endswith(".") else f"{label}."
    else:
        benefit = f"Tracked delivery to {name}."
    return [
        f"Now shipping to {name} and {total - 1} more countries & regions",
        f"Shipping to {total} countries & regions.",
        f"Available in {name} + {total - 1} more destinations.",
        benefit,
    ]


def check(code):
    home = fetch("/", code)
    name = display_name(home, code)
    words = text_of(home)
    problems = [f"missing: {s}" for s in expected_home(code, name) if s not in words]
    problems += [f"stale: {s}" for s in STALE if s in words]
    product = text_of(fetch("/products/tapnest", code))
    label = countries[code]["label"].replace("[country]", name)
    if label and label not in product:
        problems.append(f"product label missing: {label}")
    return code, problems


codes = [c for c in countries if not ONLY or c in ONLY]
results = [check(c) for c in codes]

failed = [(c, p) for c, p in results if p]
for code, problems in failed:
    for p in problems:
        print(f"{code}: {p}")
print(f"{len(codes) - len(failed)}/{len(codes)} countries pass on theme {THEME_ID}")
sys.exit(1 if failed else 0)
