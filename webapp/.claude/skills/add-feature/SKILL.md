---
name: add-feature
description: Use when adding or changing user visible behaviour in webapp (a component, a page, a state change, an API call). Test-first flow ending in a browser check.
---

# Add Feature (webapp)

## Steps

1. If the feature needs new API data, stop and do the contract first: schema in `packages/shared`, route in `api`, then come back.
   See `api/.claude/skills/add-endpoint`.

2. Write the failing test next to the code it tests (`Thing.test.tsx` beside `Thing.tsx`).
   Render with `@testing-library/react`, query by role or text, assert with `jest-dom` matchers.
   Mock `../api/client` with `vi.mock` when the component fetches.

3. Run `pnpm --filter @bbt/webapp test` and confirm it fails for the right reason.

4. Implement the smallest change that passes.
   Components live in `src/components/`, API calls in `src/api/client.ts`, config in `src/config.ts`.
   Style with tokens from `src/theme/tokens.css` only (see `knowledge/theme.md`) and write mobile first.

5. Run `pnpm --filter @bbt/webapp test` and confirm it passes.

6. Run `pnpm --filter @bbt/webapp lint` and `pnpm --filter @bbt/webapp typecheck`.

7. Run the `responsive-ui` skill: it verifies the feature at 390px and 1280px, in light and dark mode, with tokens only and 44px touch targets, and gives you the report shape.

8. If the change alters how the webapp talks to the API or the shell, update `knowledge/api-client.md` or `knowledge/ios-integration.md`.

9. Run the root `verify-all` skill and commit.
