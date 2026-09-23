# Stack

| Piece                            | Role                              | Configured in                                         |
| -------------------------------- | --------------------------------- | ----------------------------------------------------- |
| Vite                             | dev server and production bundler | `vite.config.ts`                                      |
| React 19                         | UI                                | `src/main.tsx` mounts `App` under `StrictMode`        |
| TypeScript (strict)              | types                             | `tsconfig.json` extends `../tsconfig.base.json`       |
| ESLint                           | lint, with `react-hooks` rules    | root `eslint.config.mjs`, block scoped to `webapp/**` |
| Prettier                         | formatting                        | root `.prettierrc`                                    |
| Vitest + jsdom                   | test runner and DOM               | `test` block in `vite.config.ts`                      |
| React Testing Library + jest-dom | rendering and matchers            | `src/test/setup.ts`                                   |
| `@bbt/shared`                    | response schemas                  | workspace dependency                                  |

## Notes

- `verbatimModuleSyntax` is on. Import types with `import type` or inline `type` modifiers.
- The dev server uses `strictPort: true` so a busy 5173 fails loudly instead of moving to 5174 (which would break CORS and the iOS Debug URL).
- `VITE_API_URL` is the only environment variable. Copy `.env.example` to `.env` to override locally.
- `vercel.json` declares the `vite` framework and a single page app rewrite to `index.html`.

## Deployment

- Vercel project with **Root Directory** `webapp` and framework preset Vite. Vercel installs from the repository root because it detects the pnpm workspace, so `@bbt/shared` resolves.
- Build command `pnpm build`, output directory `dist` (both are the Vite defaults).
- Environment variable `VITE_API_URL` set to the deployed api URL with no trailing slash. It is baked in at build time, so changing it requires a redeploy.
- After deploying, add this site's origin to the api project's `ALLOWED_ORIGINS`, then set `WEBAPP_URL` in `iosapp/Config/Release.xcconfig` to this URL.
