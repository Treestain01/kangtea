# Routing and Validation

## Assembly

`createApp(env)` in `src/app.ts`:

1. registers CORS for the origins in `env.ALLOWED_ORIGINS`;
2. mounts each router from `src/routes/` at its path prefix;
3. sets a JSON `notFound` handler (`404 { error: 'Not found' }`);
4. sets a JSON `onError` handler (`500 { error: 'Internal server error' }`) that logs the error.

`src/server.ts` and `api/index.ts` both call `createApp(loadEnv())`.
Nothing else constructs the app.

## Routers

One file per resource in `src/routes/`, exporting `<resource>Routes = new Hono()` with its handlers chained.
Paths inside the router are relative; the prefix is given at mount time in `app.ts`.

Current routes: `GET /health`, `GET /store`, `GET /menu`.

## Static data

`src/data/store.ts` and `src/data/menu.ts` are typed constants (`Store`, `Menu` from `@bbt/shared`) until there is a database.
Routes still parse them through the schema on the way out, so a bad edit to the data fails the route test rather than reaching a client.
The menu prices are placeholders and the file says so; replace them when the shop confirms the real menu.

## Validation

- Input: `Schema.safeParse(await c.req.json())` or of `c.req.query()`.
  On failure return `c.json({ error: 'Invalid request', issues: result.error.issues }, 400)`.
- Output: build the body as the inferred type, then `c.json(ResponseSchema.parse(body))`.
  A contract violation throws and becomes a 500 in tests rather than a silent mismatch in production.
- Schemas live in `packages/shared`, never inline in a route.

## Error shape

Every error response is JSON with an `error` string.
Validation errors add `issues` from Zod.
Do not leak stack traces or internal messages.

## CORS

`origin` is the parsed allowlist array.
Hono echoes the request origin only when it matches, and omits the header otherwise.
Preflight `OPTIONS` requests are handled by the middleware automatically.
