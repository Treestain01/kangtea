# Conventions

## Git

- Branch from `main`. Commit small and often with plain imperative messages, for example `Add health route to api`.
- No agent co-author lines in commit messages.
- Never commit generated or secret files: `*.xcodeproj`, `.vercel/`, `.env`, `node_modules`, `dist`.
- Line endings are LF, enforced by `.gitattributes`.

## Formatting and linting

- Prettier formats every JS, TS, JSON, CSS, YAML and Markdown file outside `iosapp/`. Run `pnpm format`.
- ESLint uses the single root `eslint.config.mjs`. Do not add per-package ESLint configs.
- TypeScript is strict. Every package extends `tsconfig.base.json` and overrides only `lib`, `types`, `jsx` and `include`.
- TypeScript stays on the newest major that `typescript-eslint` supports. Check its peer range before upgrading.
- Swift uses 4 space indentation and Swift 5.10 with strict concurrency.

## Testing

- Test first. Write the failing test, watch it fail, make it pass, then refactor.
- Every package keeps at least one meaningful test so `pnpm check` stays meaningful.
- `webapp` tests use Vitest with jsdom and React Testing Library. Query by role and text, not by class.
- `api` tests call `app.request()` in process. They never open a port.
- `iosapp` tests are XCTest and can only run on a Mac.

## Markdown

- No em dashes. Use `-`.
- One sentence per line in any document longer than a few lines.
- Every `knowledge/` folder has an `INDEX.md` with one line per document and no content of its own.
- `CLAUDE.md` files stay under about 60 lines. Anything longer belongs in `knowledge/` with a pointer.

## Environment

- Node 22 via `.nvmrc` to match Vercel. Newer local Node versions are fine.
- pnpm is the only package manager. Do not create `package-lock.json` or `yarn.lock`.
- `api/src/server.ts` and the `api/scripts/*` load `api/.env` through `loadDotEnv()` when the file exists. Vercel supplies variables itself, so `api/api/index.ts` does not.
- `webapp` dev server is port 5173, `api` dev server is port 3000. Do not change these without updating `iosapp/Config/Debug.xcconfig` and `api/.env.example`.
- In PowerShell, start pnpm in the background with `Start-Process -FilePath pnpm.cmd`. The bare `pnpm` resolves to a `.ps1` shim that `Start-Process` cannot launch.
- Windows PowerShell 5.1 prepends a UTF-8 BOM when piping a string into a native process. Scripts that parse piped JSON (the hooks in `.claude/hooks/`) strip a leading `U+FEFF` first.
