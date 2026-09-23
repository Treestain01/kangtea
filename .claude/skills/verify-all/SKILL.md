---
name: verify-all
description: Use when finishing any change in this repo, before declaring work done or opening a PR. Runs every check across the workspace and reports results faithfully, including what could not be verified.
---

# Verify All

## Steps

1. From the repo root run:

   ```powershell
   pnpm check
   ```

   This runs lint, typecheck, test, build and Prettier check across `webapp`, `api` and `packages/shared`.

2. If anything fails, fix the cause. Do not skip, disable or mark tests as expected failures to get green.
   Formatting failures: run `pnpm format` and re-run `pnpm check`.

3. If you changed `webapp` behaviour, start `pnpm dev` and load `http://localhost:5173` in a browser.
   Confirm the page renders and `API: ok` appears.
   Stop the dev processes afterwards.

4. If you changed `iosapp`:
   - validate `iosapp/project.yml` parses: `pnpm dlx js-yaml iosapp/project.yml | Out-Null`
   - validate `iosapp/BBT/Info.plist` parses: `[xml](Get-Content iosapp/BBT/Info.plist -Raw) | Out-Null`
   - on a Mac only: `cd iosapp; xcodegen generate; xcodebuild -scheme BBT -destination 'platform=iOS Simulator,name=iPhone 16' test`

5. Report using this exact shape:

   ```
   Verified: <list of checks that ran and passed>
   Failed: <list with the first line of each failure, or "none">
   Not verified: <what could not run and why, for example "iosapp build (Windows, no Xcode)">
   ```

## Rules

- Never report green for something you did not run.
- A check that could not run is "Not verified", never "passed".
