---
name: add-endpoint
description: Use when adding or changing an api route. Contract-first, test-first flow that keeps packages/shared, api and webapp in step.
---

# Add Endpoint (api)

## Steps

1. Define the contract in `packages/shared/src/<resource>.ts`:
   a Zod schema for the request body or query (if any) and one for the response, plus inferred types.
   Export both from `packages/shared/src/index.ts`.
   Add a test in `packages/shared/test/` that a valid object passes and an invalid one fails.

2. Write the failing route test in `api/test/<resource>.test.ts`:

   ```ts
   const app = createApp(
     { ALLOWED_ORIGINS: 'http://localhost:5173', PORT: 3000, DATABASE_URL: undefined },
     { catalogue: createSeedCatalogue(loadSeed()) },
   );
   const res = await app.request('/things', {
     method: 'POST',
     body: JSON.stringify(input),
     headers: { 'content-type': 'application/json' },
   });
   expect(res.status).toBe(201);
   expect(ThingResponseSchema.safeParse(await res.json()).success).toBe(true);
   ```

   Cover: success, invalid input returns 400 with a JSON error, and any not found case.

3. Run `pnpm --filter @bbt/api test` and confirm the new test fails for the right reason.

4. Create `api/src/routes/<resource>.ts` exporting `export const <resource>Routes = new Hono()...`.
   If the route needs data, make it a factory that takes what it reads from (`(catalogue: Catalogue) => new Hono()...`) and add that dependency to `AppDeps` in `src/create-app.ts`.
   New tables go in `src/db/schema.ts` followed by `pnpm db:generate --name <change>`; see `knowledge/database.md`.
   Validate input with `schema.safeParse` and return `c.json({ error: ... }, 400)` on failure.
   Build the response as the inferred type and return `c.json(ResponseSchema.parse(body))`.

5. Mount it in `api/src/create-app.ts`: `app.route('/things', thingRoutes(deps.catalogue))`.

6. Run `pnpm --filter @bbt/api test`, `lint`, `typecheck`.

7. Add the webapp client function (see `webapp/knowledge/api-client.md`) if the webapp will call it.

8. Update `api/knowledge/routing-and-validation.md` if you introduced a new pattern, and run the root `verify-all` skill.
