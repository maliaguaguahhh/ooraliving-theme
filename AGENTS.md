# Shopify theme workflow

- Before changing theme files, identify the current Shopify live theme and the intended remote target. Compare or pull the latest remote version into a clean worktree; preserve all existing local changes.
- Keep every theme change synchronized in local Git and the corresponding Shopify theme. During development, push only to an explicitly identified unpublished theme and verify the uploaded files against local files. Never publish or push to the live theme without explicit approval.
- Report the local branch/commit and Shopify theme ID after each synchronization. If either side cannot be synchronized, say so clearly rather than calling the change complete.
- Keep test products and SKUs in Draft on the production store. Unlisted products can still be bought through a direct URL; use a separate development store for end-to-end checkout tests.
- Do not push a full theme snapshot to a GitHub remote without explicit confirmation of the destination repository and the contents being sent.
