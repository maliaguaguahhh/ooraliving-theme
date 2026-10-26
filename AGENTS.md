# Shopify theme workflow

- Before changing theme files, identify the current Shopify live theme and the intended remote target. Compare or pull the latest remote version into a clean worktree; preserve all existing local changes.
- Keep every theme change synchronized in local Git and the corresponding Shopify theme. During development, push only to an explicitly identified unpublished theme and verify the uploaded files against local files. Never publish or push to the live theme without explicit approval.
- Report the local branch/commit and Shopify theme ID after each synchronization. If either side cannot be synchronized, say so clearly rather than calling the change complete.
- Keep test products and SKUs in Draft on the production store. Unlisted products can still be bought through a direct URL; use a separate development store for end-to-end checkout tests.
- Do not push a full theme snapshot to a GitHub remote without explicit confirmation of the destination repository and the contents being sent.

# Building features

- Before building a feature, list every piece of copy and every image it shows (headings, notes, labels, tags, button text, photos) and decide where each one lives:
  - Changes per product → a product metafield, or a metaobject referenced from one when the content has several fields or repeats (FAQ items, highlights, comparison rows, bundle offer).
  - Same across the store but edited by non-developers or reused in several places → a shop metafield/metaobject, or a dedicated product (as Gift Wrap supplies its own photos and description).
  - Layout, on/off switches and colors → Theme settings. Theme settings text can also act as the default when a product leaves its metafield empty.
  Never hardcode customer-facing copy or images in Liquid.
- When a feature adds per-product content, say which products need an entry, create the metafield/metaobject definition (pinned, with clear names and descriptions) only after the user approves, and make the theme fall back cleanly (default text or hide the block) for products without one. Then update the Chinese guide document with where each field is edited.
- After a design change, remove or flag metafield/metaobject fields the theme no longer reads; ask before deleting a definition or field, since that deletes its data.
- Use the theme's color scheme variables for accent colors (buttons, badges, tags, checkmarks, stars), not hardcoded hex values, so new UI matches the theme's pink.
