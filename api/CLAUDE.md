# api

## Purpose

The Kang Tea backend (service id `bbt-api`).
Hono + TypeScript, deployed to Vercel as a single serverless function.
Serves `webapp` only; the iOS shell never calls it directly.

## Commands (run from `api/` or with `pnpm --filter @bbt/api <script>`)

- `pnpm dev` - `tsx watch src/server.ts` on http://localhost:3000. Copy `.env.example` to `.env` to change settings.
- `pnpm test` - Vitest, in process via `app.request()`. No port is opened.
- `pnpm lint`, `pnpm typecheck` - ESLint and `tsc --noEmit`.
- There is intentionally no `build` script. Vercel compiles `api/index.ts` itself.

## Rules

- Every request boundary is validated with Zod. Every response is parsed against its schema from `@bbt/shared` before it is sent.
- Contract changes start in `packages/shared`, then here, then `webapp`.
- Only `src/env.ts` reads `process.env`. Add new variables to its schema and to `.env.example`.
- `createApp(env)` must stay pure with respect to environment so tests can construct it.
- One router per file in `src/routes/`, mounted in `src/app.ts`.
- Use the `add-endpoint` skill for new routes.
- CORS origins come from `ALLOWED_ORIGINS`. Never use `*`.

## Where to look

- `knowledge/INDEX.md` - start here.
- `knowledge/routing-and-validation.md` - how routes and schemas fit together.
- `knowledge/deployment.md` - Vercel project settings and environment variables.
- Skills: `.claude/skills/add-endpoint`, `.claude/skills/check`, `.claude/skills/run-local`.
- Agency agent: `back-end-engineer` (see root `CLAUDE.md`).
