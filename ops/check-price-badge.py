"""Checks the price badge next to a discounted price on a Shopify theme preview.

The badge comes from the shop metafield custom.price_badge (a price_badge metaobject).
Checks the product page and the homepage featured product. Exit code 1 when a check fails.

Usage: python -I ops/check-price-badge.py theme_id "expected text" [background] [country] [shipping color]
       Pass "" as the expected text to assert that no badge is shown.
       The shipping color is the color of the free shipping line under the price; only pass it
       for a country that shows that line (paid-shipping countries such as DE have none).
"""

import html
import http.cookiejar
import re
import sys
import urllib.request

# The myshopify domain redirects here and drops preview_theme_id, so a preview needs its cookie.
STORE = "https://ooraliving.com"
THEME_ID, EXPECTED = sys.argv[1], sys.argv[2]
BACKGROUND = sys.argv[3] if len(sys.argv) > 3 else ""
COUNTRY = sys.argv[4] if len(sys.argv) > 4 else "US"
SHIPPING_COLOR = sys.argv[5] if len(sys.argv) > 5 else ""

opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
opener.addheaders = [("User-Agent", "Mozilla/5.0 (oora price badge check)")]


def get(url):
    with opener.open(url, timeout=60) as res:
        return res.read().decode("utf-8")


def page_of(path):
    page = get(f"{STORE}{path}?country={COUNTRY}")
    served = re.search(r'Shopify\.theme = \{[^}]*"id":(\d+)', page)
    if not served or served.group(1) != THEME_ID:
        raise RuntimeError(f"{path}: served theme {served and served.group(1)}, not {THEME_ID}")
    return page


def badges(page):
    # Extra classes (e.g. hl-sheen from a holiday look) may follow the badge class.
    found = re.findall(r'<span\s+class="tapnest-product-hero__save[^"]*"([^>]*)>(.*?)</span>', page, re.S)
    return [(html.unescape(attrs), html.unescape(re.sub(r"\s+", " ", text).strip())) for attrs, text in found]


get(f"{STORE}/?preview_theme_id={THEME_ID}")
failed = False
for path in ("/products/tapnest", "/"):
    page = page_of(path)
    found = badges(page)
    texts = sorted({text for _, text in found})
    ok = texts == ([EXPECTED] if EXPECTED else [])
    if ok and BACKGROUND:
        ok = all(BACKGROUND.lower() in attrs.lower() for attrs, _ in found)
    lines = re.findall(r'<div class="tapnest-product-hero__free-shipping"([^>]*)>', page)
    if ok and SHIPPING_COLOR:
        ok = bool(lines) and all(SHIPPING_COLOR.lower() in attrs.lower() for attrs in lines)
    failed = failed or not ok
    print(f"{'ok  ' if ok else 'FAIL'} {path} [{COUNTRY}]: {found or 'no badge'}; shipping line {lines}")
sys.exit(1 if failed else 0)
