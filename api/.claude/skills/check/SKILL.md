---
name: check
description: Use when you need to know whether api is green. Runs lint, typecheck and tests for api only and states what green means.
---

# Check (api)

## Steps

1. Run from the repo root:

   ```powershell
   pnpm --filter @bbt/api lint
   pnpm --filter @bbt/api typecheck
   pnpm --filter @bbt/api test
   ```

2. Green means zero ESLint errors, `tsc` exits 0, and every Vitest test passes.
   There is no build step to check.

3. On failure, fix the cause. Never disable a rule or skip a test to pass.

4. Report each command as passed or failed with the first line of any failure.
