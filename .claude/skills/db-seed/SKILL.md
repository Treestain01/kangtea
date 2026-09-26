---
name: db-seed
description: Use when a Vercel Postgres database for the api needs the base catalogue (store, menu, customisations) from seed.json, after a wipe, on a new environment, or after editing seed.json. Migrates first, then replaces the catalogue.
---

# Seed the database

Seeding replaces the whole catalogue with `seed.json` from the repository root, inside one transaction.
It applies pending migrations first, so a freshly wiped or brand new database works.
Orders and accounts live in the browser and are not touched.

## Steps

1. Know the target.
   Ask which environment if the request does not say: `development` (your own branch database), `preview`, or `production`.
   Never assume production.

2. Get `DATABASE_URL` for that environment into `api/.env`.
   The Vercel Neon integration sets it on the `bbt-api` Vercel project.

   ```powershell
   Set-Location api
   pnpm dlx vercel env pull .env --environment=<development|preview|production>
   ```

   The first run asks you to log in and link the project.
   Choose the existing `bbt-api` project; do not create a new one.
   `api/.env` is git ignored.

3. Check the seed is valid before touching the database:

   ```powershell
   pnpm --filter @bbt/api test -- test/seed.test.ts
   ```

4. Dry run. The script prints the target host and refuses without `--yes`:

   ```powershell
   pnpm --filter @bbt/api db:seed
   ```

   Read the host it printed.
   Neon branch hosts differ per environment; confirm it matches the environment from step 1.

5. Seed for real:

   ```powershell
   pnpm --filter @bbt/api db:seed -- --yes
   ```

   Expected last lines: `Seeded 6 categories, 15 items, 6 toppings and store calamvale-central.` then `Done.` (counts follow `seed.json`).

6. Prove it. With the api running against the same `.env` (`pnpm --filter @bbt/api dev`), or against the deployed URL:

   ```powershell
   (Invoke-RestMethod http://localhost:3000/menu).items.Count
   ```

   The count must equal the number of items in `seed.json`.

7. If you pulled a production or preview `.env` onto a machine that normally runs without a database, delete `api/.env` or remove `DATABASE_URL` from it afterwards so local dev goes back to the seed fallback.

## Rules

- Editing the menu means editing `seed.json`, running `pnpm --filter @bbt/api test`, committing, then running this skill per environment.
- Never edit rows by hand in the Neon console; the next seed would silently overwrite them.
- If migrations fail, stop and fix them. Do not wipe production to get past a failing migration without being told to.
