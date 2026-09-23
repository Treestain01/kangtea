# webapp

## Purpose

The Kang Tea website.
React 19 + TypeScript built with Vite, deployed to Vercel as a static site.
It runs in any browser and inside the `iosapp` WKWebView, and must behave identically in both.

## Commands (run from `webapp/` or with `pnpm --filter @bbt/webapp <script>`)

- `pnpm dev` - Vite dev server on http://localhost:5173 (strict port).
- `pnpm test` - Vitest with jsdom and React Testing Library.
- `pnpm lint`, `pnpm typecheck`, `pnpm build` - ESLint, `tsc --noEmit`, `vite build` to `dist/`.
- Needs `api` running on port 3000 for the health status to show `ok`. `pnpm dev` at the repo root starts both.

## Rules

- Test first. Use the `add-feature` skill for any new behaviour.
- Every UI change serves phones and desktops. Use the `responsive-ui` skill whenever you touch a `.tsx` or `.css` file; a hook reminds you.
- Colours only via `var(--color-*)` from `src/theme/tokens.css`. Breakpoints only 768px and 1024px. `src/theme/tokens.test.ts` enforces both.
- Query the DOM by role and text in tests, never by class name.
- Only `src/config.ts` reads `import.meta.env`. Only `src/api/client.ts` calls `fetch` against the API.
- Parse every API response with the schema from `@bbt/shared`. Never hand write a response type.
- Do not add iOS only code paths beyond `isInIosShell()` checks. The site must work without the shell.
- Keep `index.html` `viewport-fit=cover` and the `env(safe-area-inset-*)` padding in `styles.css`.
- Never break `pnpm build`. The deploy is the static build.

## Where to look

- `knowledge/INDEX.md` - start here.
- `knowledge/ios-integration.md` - what the shell does and does not do for you.
- `knowledge/api-client.md` - how to call the API.
- `knowledge/theme.md` - every token and what it is for.
- Skills: `.claude/skills/add-feature`, `.claude/skills/responsive-ui`, `.claude/skills/check`.
- Agency agent: `front-end-engineer` (see root `CLAUDE.md`).
