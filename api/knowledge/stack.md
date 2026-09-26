# Stack

| Piece                       | Role                                      | Configured in                                                          |
| --------------------------- | ----------------------------------------- | ---------------------------------------------------------------------- |
| Hono                        | router and middleware                     | `src/create-app.ts`                                                    |
| `hono/cors`                 | CORS allowlist                            | `src/create-app.ts` from `ALLOWED_ORIGINS`                             |
| Vercel Hono preset          | serves the default export as one function | `index.ts`, `vercel.json` (`"framework": "hono"`)                      |
| `@hono/node-server` + `tsx` | local dev server with reload              | `src/server.ts`, `dev` script                                          |
| Zod                         | environment and boundary validation       | `src/env.ts`, routes                                                   |
| `@bbt/shared`               | contract schemas                          | workspace dependency                                                   |
| Drizzle ORM + `pg`          | Postgres access and migrations            | `src/db/`, `drizzle.config.ts`, `drizzle/`                             |
| drizzle-kit                 | generates SQL migrations                  | `db:generate` script                                                   |
| PGlite                      | in process Postgres for tests             | `test/db.test.ts`                                                      |
| TypeScript (strict)         | types                                     | `tsconfig.json` extends `../tsconfig.base.json` with `types: ["node"]` |
| Vitest                      | tests via `app.request()`                 | default config, `test/**/*.test.ts`                                    |

## Notes

- `type: module` and `moduleResolution: Bundler`. Relative imports have no extensions; tsx, Vitest and Vercel's bundler all resolve them.
- `Env` is the parsed shape of `process.env`. `createApp(env, deps)` takes it and the storage as parameters so tests never touch `process.env` or a network.
- `drizzle.config.ts` is read by drizzle-kit only and holds no credentials; `src/env.ts` remains the only reader of `process.env`.
- Logging middleware is intentionally absent. Vercel records requests. Add `hono/logger` only if local debugging needs it.
