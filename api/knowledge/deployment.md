# Deployment

## Vercel project

- Import the git repository into Vercel and set **Root Directory** to `api`.
- Framework preset: **Hono**. Vercel selects it automatically and `vercel.json` pins it with `"framework": "hono"`.
- Vercel detects the pnpm workspace and installs from the repository root, so `@bbt/shared` and `seed.json` resolve.
- Build command and output directory: leave empty. There is no `build` script on purpose.
- The preset looks for the first of `app`, `index`, `server`, `src/app`, `src/index`, `src/server` (`.ts` or `.js`) that imports `hono` and serves its default export.
  Ours is `index.ts` at the project root; it default exports the Hono app and nothing else in that list imports `hono`.
- Every request is routed to the app by the preset, so `vercel.json` has no rewrites.
  Static files, if ever needed, go in `public/`.

## Environment variables

| Name                       | Purpose                             | Production value                                                                                                  |
| -------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `ALLOWED_ORIGINS`          | comma separated CORS allowlist      | the deployed webapp origin, for example `https://bbt.vercel.app`                                                  |
| `KANG_TEA_DB_DATABASE_URL` | Postgres connection string (pooled) | installed by the Neon integration with the `KANG_TEA_DB_` prefix; the api reads this name or plain `DATABASE_URL` |

`PORT` is ignored on Vercel.
Without a database URL the function serves `seed.json` and logs a warning on every cold start; treat that as a misconfiguration in production.
The integration marks its variables sensitive, so neither the dashboard API nor `vercel env pull` can read them back. Copy the connection string from the database's page under the Storage tab when you need it locally.

## Database

1. In the Vercel project, open Storage and create or connect a Neon Postgres database. The database `kangtea-db` is connected to `kangtea-api` with the variable prefix `KANG_TEA_DB_`.
2. Neon creates a branch per Vercel environment when the integration is set that way, so preview and production do not share data.
3. Load each environment with the root `db-seed` skill before pointing traffic at it. Migrations are never run at request time.
4. `seed.json` is imported from the repository root, one level above the project root directory. Vercel includes files outside the root directory for workspaces, which is also how `@bbt/shared` is resolved.

## After deploying

1. `GET https://<api-domain>/health` returns the health JSON.
2. `GET https://<api-domain>/menu` returns the seeded menu (compare the item count with `seed.json`).
3. Set `VITE_API_URL` in the webapp Vercel project to `https://<api-domain>` and redeploy the webapp.
4. Load the webapp and confirm `API: ok` with no CORS error in the console.

## Limits to remember

- Serverless execution time and payload limits apply. Long jobs need a queue or another host.
- Cold starts happen. Keep the function's import graph small.
