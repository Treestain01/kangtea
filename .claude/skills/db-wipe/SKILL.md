---
name: db-wipe
description: Use when a Vercel Postgres database for the api must be emptied completely, for example before reseeding a broken environment or resetting a preview branch. Drops every table and the migration journal after an explicit confirmation.
---

# Wipe the database

Wiping drops schema `public` (then recreates it empty) and schema `drizzle`, where the migration journal lives.
Afterwards the database is as new: no tables, no rows, no record of migrations.
Run the `db-seed` skill next to rebuild it.

## Steps

1. Know the target and get a human yes.
   Ask which environment if the request does not say: `development`, `preview`, or `production`.
   For `production`, quote the host you are about to wipe back to the user and wait for their confirmation in this conversation before step 4.

2. Get the connection string for that environment into `api/.env` as `DATABASE_URL=...`.
   The Neon integration marks its variables sensitive, so `vercel env pull` cannot read them; copy it from the `kangtea-db` database page under the Storage tab of the `kangtea-api` Vercel project.

3. Dry run. The script prints the target host and refuses without `--yes`:

   ```powershell
   pnpm --filter @bbt/api db:wipe
   ```

   Confirm the printed host is the environment from step 1.

4. Wipe:

   ```powershell
   pnpm --filter @bbt/api db:wipe -- --yes
   ```

   Expected: `Wiping every table and migration record on <host>/<db>` then `Done.`

5. Rebuild with the `db-seed` skill unless the user wanted the database left empty.

6. If you pulled a production or preview `.env` onto a machine that normally runs without a database, delete `api/.env` or remove `DATABASE_URL` from it afterwards.

## Rules

- A wipe cannot be undone. Neon keeps point in time history on paid plans only; do not rely on it.
- Never wipe production to work around a failing migration or test. Fix the cause.
- Report exactly what ran: the host, the command, and the last line of output.
