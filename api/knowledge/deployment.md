# Deployment

## Vercel project

- Import the git repository into Vercel and set **Root Directory** to `api`.
- Framework preset: Other.
- Vercel detects the pnpm workspace and installs from the repository root, so `@bbt/shared` resolves.
- Build command: leave empty. There is no `build` script on purpose.
  Vercel compiles `api/api/index.ts` (the `api/` folder inside the project) into one Node serverless function.
- `vercel.json` rewrites every path to `/api/index`, so Hono sees the full path.

## Environment variables

| Name              | Purpose                        | Production value                                                   |
| ----------------- | ------------------------------ | ------------------------------------------------------------------ |
| `ALLOWED_ORIGINS` | comma separated CORS allowlist | the deployed webapp origin, for example `https://bbt.vercel.app`   |
| `DATABASE_URL`    | Postgres connection string     | set by the Neon integration (Storage tab of the `bbt-api` project) |

`PORT` is ignored on Vercel.
Without `DATABASE_URL` the function serves `seed.json` and logs a warning on every cold start; treat that as a misconfiguration in production.

## Database

1. In the Vercel project, open Storage and create or connect a Neon Postgres database. Accept the default `DATABASE_URL` variable name.
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
