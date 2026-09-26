# 0015 Bundle the api function with esbuild

Date: 2026-09-26
Status: Accepted

## Context

ADR 0013 deployed the api through Vercel's Hono preset with no build step, letting Vercel compile TypeScript file by file.
That compile is not a bundle: the function ran as loose ES modules and failed twice in production, first on directory imports (fixed by ADR 0014) and then because `@bbt/shared` exports its `.ts` source, which no longer exists once Vercel has compiled it to `.js`.
Vercel offers an experimental bundling mode behind `VERCEL_EXPERIMENTAL_BACKENDS=1`, but production should not depend on an experimental flag.
The Hono builder runs a project's `build` script when one exists and, when an output directory is configured, looks there first for `index.js` importing `hono`.

## Decision

`pnpm build` in `api` runs esbuild on `index.ts` and writes one ES module to `dist/index.js`.
Dependencies stay external (`--packages=external`) so Vercel traces `hono`, `pg`, `drizzle-orm` and `zod` from `node_modules`; `@bbt/shared` is aliased to its source and bundled in, together with `seed.json`.
`vercel.json` sets `"outputDirectory": "dist"`, so the Hono preset serves the bundle.
`index.ts` stays the entrypoint, `src/create-app.ts` the factory, and `src/server.ts` the local dev server, as in ADR 0013.

## Alternatives considered

- `VERCEL_EXPERIMENTAL_BACKENDS=1`: solves the same problem with no code, but is experimental and undocumented beyond a changelog entry.
- Giving `@bbt/shared` its own `dist` build: adds a build order between three packages and two Vercel projects, and a watch step to local development, to serve one consumer.
- Publishing shared with `exports` pointing at `.js` paths that only exist after Vercel compiles: depends on undocumented builder behaviour and breaks local resolution.
- Copying the shared schemas into the api: duplicates the contract, which ADR 0005 exists to prevent.

## Consequences

- `dist/` is build output, git ignored and rebuilt by `pnpm build`, which `pnpm check` runs.
- The deployed function is one file of about 20 KB plus traced dependencies, so cold starts get smaller, not larger.
- Anything imported by the api must be resolvable by esbuild at build time; a new workspace package needs its own `--alias` in the build script.
- `import.meta.url` still works in the bundle; `migrationsFolder` resolves relative to `dist/`, which only matters for the scripts, and they run from source with tsx.
- Supersedes 0013's "no build script" consequence; the rest of 0013 stands.
