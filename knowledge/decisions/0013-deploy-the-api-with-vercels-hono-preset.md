# 0013 Deploy the api with Vercel's Hono preset

Date: 2026-09-26
Status: Accepted

## Context

ADR 0004 exposed the Hono app as a hand written Vercel function in `api/api/index.ts` through `hono/vercel`, with a `vercel.json` rewrite sending every path to it.
Vercel has since added a first party Hono framework preset, and its project creation flow now auto selects Hono for this project.
The preset finds the first of `app`, `index`, `server`, `src/app`, `src/index`, `src/server` (any JS or TS extension) that imports `hono`, and serves that file's default export.
Our `src/app.ts` imported `hono` and exported only `createApp`, so the preset would have picked a file with no default export.

## Decision

Hono stays, and the api deploys through Vercel's Hono framework preset, pinned with `"framework": "hono"` in `api/vercel.json`.
`api/index.ts` is the single Vercel entrypoint: it loads env, builds the catalogue and default exports the Hono app.
The app factory lives in `src/create-app.ts`, a name outside the preset's candidate list, so detection is unambiguous.
`src/server.ts` remains the local dev server with `@hono/node-server`, and Zod still validates every boundary.
There is no `api/` functions directory and no rewrite; the preset routes every request to the app.

## Alternatives considered

- Framework preset "Other" with the old `api/api/index.ts` function: works, but fights the auto detected preset on every new project and keeps a hand rolled adapter the platform now provides.
- Default exporting the app from `src/app.ts`: would build the app and open the database pool at import time, which the tests import, breaking the rule that `createApp` stays pure.
- Adding a `build` script: the preset would run it, but there is nothing to build; Vercel compiles TypeScript itself.

## Consequences

- Nothing in the candidate list other than `index.ts` may import `hono` directly. `src/create-app.ts` and the routers are the only Hono importers under `src/`, and none of them sit at a candidate path.
- `hono/vercel` is no longer used anywhere.
- The Vercel project needs no rewrite configuration; static files would go in `api/public/` if ever needed.
- Local development is unchanged: `pnpm dev` runs `src/server.ts` with tsx.
- Supersedes the deployment mechanism in 0004; the choice of Hono and Zod from 0004 carries forward.
