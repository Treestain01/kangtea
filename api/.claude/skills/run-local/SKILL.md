---
name: run-local
description: Use when you need the api running locally to test against, from the webapp or with curl. Starts it, proves it answers, and stops it cleanly.
---

# Run Local (api)

## Steps

1. Optional: copy `api/.env.example` to `api/.env` and edit. Defaults are `ALLOWED_ORIGINS=http://localhost:5173`, `PORT=3000`.
   Without `DATABASE_URL` the api serves `seed.json` and logs one warning; set it (see the `db-seed` skill) to run against a real database.

2. Start in the background from the repo root.
   Use `pnpm.cmd`, not `pnpm`; the bare name resolves to a `.ps1` shim that `Start-Process` cannot launch.

   ```powershell
   $api = Start-Process -FilePath pnpm.cmd -ArgumentList '--filter','@bbt/api','dev' -PassThru -NoNewWindow
   Start-Sleep -Seconds 5
   ```

3. Prove it answers:

   ```powershell
   Invoke-RestMethod http://localhost:3000/health
   ```

   Expected: `status ok`, `service bbt-api`, an ISO timestamp.

4. Do your testing. `tsx watch` reloads on every save.

5. Stop it:

   ```powershell
   Stop-Process -Id $api.Id -Force
   Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.StartTime -gt (Get-Date).AddMinutes(-10) } | Stop-Process -Force
   ```

   The second line clears the orphaned `tsx` watcher without touching older Node processes.

## Notes

- To run api and webapp together use `pnpm dev` at the repo root instead.
- Port in use: something else holds 3000. Find it with `Get-NetTCPConnection -LocalPort 3000`.
