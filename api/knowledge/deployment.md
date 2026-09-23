# Deployment

## Vercel project

- Import the git repository into Vercel and set **Root Directory** to `api`.
- Framework preset: Other.
- Vercel detects the pnpm workspace and installs from the repository root, so `@bbt/shared` resolves.
- Build command: leave empty. There is no `build` script on purpose.
  Vercel compiles `api/api/index.ts` (the `api/` folder inside the project) into one Node serverless function.
- `vercel.json` rewrites every path to `/api/index`, so Hono sees the full path.

## Environment variables

| Name              | Purpose                        | Production value                                                 |
| ----------------- | ------------------------------ | ---------------------------------------------------------------- |
| `ALLOWED_ORIGINS` | comma separated CORS allowlist | the deployed webapp origin, for example `https://bbt.vercel.app` |

`PORT` is ignored on Vercel.

## After deploying

1. `GET https://<api-domain>/health` returns the health JSON.
2. Set `VITE_API_URL` in the webapp Vercel project to `https://<api-domain>` and redeploy the webapp.
3. Load the webapp and confirm `API: ok` with no CORS error in the console.

## Limits to remember

- Serverless execution time and payload limits apply. Long jobs need a queue or another host.
- Cold starts happen. Keep the function's import graph small.
