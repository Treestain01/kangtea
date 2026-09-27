# Routing and Validation

## Assembly

`createApp(env, deps)` in `src/create-app.ts`:

1. registers CORS for the origins in `env.ALLOWED_ORIGINS`;
2. mounts each router from `src/routes/` at its path prefix;
3. sets a JSON `notFound` handler (`404 { error: 'Not found' }`);
4. sets a JSON `onError` handler (`500 { error: 'Internal server error' }`) that logs the error.

`src/server.ts` (local) and `index.ts` (Vercel) both call `createApp(env, { catalogue: createCatalogue(env) })`.
Nothing else constructs the app.

## Routers

One file per resource in `src/routes/`, exporting `<resource>Routes = new Hono()` with its handlers chained.
Paths inside the router are relative; the prefix is given at mount time in `create-app.ts`.

Current routes: `GET /health`, `GET /store`, `GET /menu`, and under `/auth`: `POST /sign-up`, `POST /sign-in`, `POST /sign-out`, `GET /me`, `PATCH /me` (see `accounts.md`).

## Data access

Routers that need data are factories taking what they read from (`storeRoutes(catalogue)`, `menuRoutes(catalogue)`, `authRoutes(accounts)`), so they never import a database module.
`createDeps(env)` in `src/deps.ts` builds those dependencies over one database connection.
The catalogue comes from Postgres or from `seed.json`; see `database.md`.
Routes still parse the result through the schema on the way out, so a bad row fails the route rather than reaching a client.
The menu in `seed.json` is transcribed from the in-store board photographed on 2026-09-27 (fruit tea, Yakult, Milo and matcha series, toppings, sugar and ice levels).

## Validation

- Input: `Schema.safeParse(await c.req.json())` or of `c.req.query()`.
  On failure return `c.json({ error: 'Invalid request', issues: result.error.issues }, 400)`.
- Output: build the body as the inferred type, then `c.json(ResponseSchema.parse(body))`.
  A contract violation throws and becomes a 500 in tests rather than a silent mismatch in production.
- Schemas live in `packages/shared`, never inline in a route.

## Authentication

Protected routes read `Authorization: Bearer <token>` and call `accounts.resolve(token)`; a missing or unknown token answers `401 { error: 'Sign in first' }`.
`AccountsError` from the provider maps to 409 (`email-taken`), 401 (`invalid-credentials`) or 503 (`unavailable`) in `src/routes/auth.ts`.
There is no global auth middleware yet; add one when a second protected router appears.

## Error shape

Every error response is JSON with an `error` string.
Validation errors add `issues` from Zod.
Do not leak stack traces or internal messages.

## CORS

`origin` is the parsed allowlist array.
Hono echoes the request origin only when it matches, and omits the header otherwise.
Preflight `OPTIONS` requests are handled by the middleware automatically.
