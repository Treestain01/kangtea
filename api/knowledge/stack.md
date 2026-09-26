# Stack

| Piece                       | Role                                    | Configured in                                                          |
| --------------------------- | --------------------------------------- | ---------------------------------------------------------------------- |
| Hono                        | router and middleware                   | `src/create-app.ts`                                                    |
| `hono/cors`                 | CORS allowlist                          | `src/create-app.ts` from `ALLOWED_ORIGINS`                             |
| esbuild                     | bundles `index.ts` into `dist/index.js` | `build` script in `package.json`                                       |
| Vercel Hono preset          | serves `dist/index.js` as one function  | `vercel.json` (`"framework": "hono"`, `"outputDirectory": "dist"`)     |
| `@hono/node-server` + `tsx` | local dev server with reload            | `src/server.ts`, `dev` script                                          |
| Zod                         | environment and boundary validation     | `src/env.ts`, routes                                                   |
| `@bbt/shared`               | contract schemas                        | workspace dependency                                                   |
| Drizzle ORM + `pg`          | Postgres access and migrations          | `src/db/`, `drizzle.config.ts`, `drizzle/`                             |
| drizzle-kit                 | generates SQL migrations                | `db:generate` script                                                   |
| PGlite                      | in process Postgres for tests           | `test/db.test.ts`                                                      |
| TypeScript (strict)         | types                                   | `tsconfig.json` extends `../tsconfig.base.json` with `types: ["node"]` |
| Vitest                      | tests via `app.request()`               | default config, `test/**/*.test.ts`                                    |

## Notes

- `type: module` with `module` and `moduleResolution` set to `NodeNext`. Relative imports carry a `.js` suffix because Vercel runs the compiled files as native Node ES modules without bundling; tsx and Vitest map them back to `.ts` locally. See ADR 0014.
- `Env` is the parsed shape of `process.env`. `createApp(env, deps)` takes it and the storage as parameters so tests never touch `process.env` or a network.
- `drizzle.config.ts` is read by drizzle-kit only and holds no credentials; `src/env.ts` remains the only reader of `process.env`.
- Logging middleware is intentionally absent. Vercel records requests. Add `hono/logger` only if local debugging needs it.
