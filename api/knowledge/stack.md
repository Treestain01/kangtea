# Stack

| Piece                       | Role                                | Configured in                                                          |
| --------------------------- | ----------------------------------- | ---------------------------------------------------------------------- |
| Hono                        | router and middleware               | `src/app.ts`                                                           |
| `hono/cors`                 | CORS allowlist                      | `src/app.ts` from `ALLOWED_ORIGINS`                                    |
| `hono/vercel`               | adapts the app to a Vercel function | `api/index.ts`                                                         |
| `@hono/node-server` + `tsx` | local dev server with reload        | `src/server.ts`, `dev` script                                          |
| Zod                         | environment and boundary validation | `src/env.ts`, routes                                                   |
| `@bbt/shared`               | contract schemas                    | workspace dependency                                                   |
| TypeScript (strict)         | types                               | `tsconfig.json` extends `../tsconfig.base.json` with `types: ["node"]` |
| Vitest                      | tests via `app.request()`           | default config, `test/**/*.test.ts`                                    |

## Notes

- `type: module` and `moduleResolution: Bundler`. Relative imports have no extensions; tsx, Vitest and Vercel's bundler all resolve them.
- `Env` is the parsed shape of `process.env`. `createApp(env)` takes it as a parameter so tests never touch `process.env`.
- Logging middleware is intentionally absent. Vercel records requests. Add `hono/logger` only if local debugging needs it.
