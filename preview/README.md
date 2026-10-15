# NFC local design preview

Astra designed the compact tutorial rail. Existing Shortcut Preset Library cards, content, images and links are retained.

## Open

Run `node preview/nfc-server.mjs` from the theme directory, then open http://127.0.0.1:8097.
The server requires `liquidjs` installed at `/private/tmp/nfc-preview-deps` (installed for this preview session).

- `/`: uses the publicly observed live setup video only as a local preview fixture. The second tutorial still uses the exported placeholder URL.
- `/?fixture=export`: both original exported YouTube URLs.
- `/?fixture=five`: 5-card growth test; the extra three cards are explicitly labelled layout tests and are not saved in the theme template.

The preview renders the actual Liquid sections, snippets, and their CSS/JS. A small adapter supplies Shopify filters, images, translations and global style settings. The header/footer are simplified local framing; this is not an authenticated Shopify theme preview or a complete storefront regression test.

## Safe scope

- No remote theme was uploaded, published or modified.
- `templates/page.multi-column.json` remains unchanged.
- `templates/page.nfc-preview.json` is a separate, unassigned template.
- Shared video/grid/modal snippets remain unchanged.
- The gallery's new `enable_show_more` setting defaults to false; only the preview template enables it. Without JavaScript, all shortcuts remain visible. The theme editor also keeps all cards visible.
- Existing unrelated workspace changes were preserved, including previous edits in the locale file.

## Behavior checked locally

375px / 390px mobile, 768px tablet and 1440px desktop: no whole-page horizontal overflow; 4 initial shortcuts on mobile and 6 on larger viewports; reveal all 15 and collapse; tutorial rail navigation with five cards; video modal within mobile viewport; Escape/close restores focus and removes media.

## Before a future Shopify release

The public live page is newer than this local export: its setup tutorial uses Shopify-hosted media and its Wake-up Routine shortcut link differs. Do not upload this exported preview template over live page settings. Reconcile current live configuration first, select the final video assets, then validate an unpublished Shopify theme copy including theme-editor lifecycle and real iOS playback. The local preview cannot establish full production compatibility.
