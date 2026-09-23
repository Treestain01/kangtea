---
name: check
description: Use when you need to know whether webapp is green. Runs lint, typecheck, tests and the production build for webapp only and states what green means.
---

# Check (webapp)

## Steps

1. Run from the repo root:

   ```powershell
   pnpm --filter @bbt/webapp lint
   pnpm --filter @bbt/webapp typecheck
   pnpm --filter @bbt/webapp test
   pnpm --filter @bbt/webapp build
   ```

2. Green means: zero ESLint errors, `tsc` exits 0, every Vitest test passes, and `webapp/dist/index.html` exists.

3. On failure, fix the cause. Never disable a rule or skip a test to pass.

4. Report each of the four commands as passed or failed with the first line of any failure.
