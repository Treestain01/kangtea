# 0014 Explicit ESM specifiers in api and shared

Date: 2026-09-26
Status: Accepted

## Context

The first api deployment on Vercel's Hono preset built successfully and then failed every request with `ERR_UNSUPPORTED_DIR_IMPORT` for `api/src/catalogue`.
Vercel compiles each TypeScript file to JavaScript in place and runs the result as native Node ES modules, without bundling.
Node's ESM loader resolves neither extensionless relative imports (`./env`) nor directory imports (`./catalogue`), which `moduleResolution: Bundler` had let us write everywhere.
`packages/shared` is consumed as TypeScript source by both the api and the webapp, so the same rule has to hold there.

## Decision

`api` and `packages/shared` use `module: NodeNext` and `moduleResolution: NodeNext`, and every relative import names the compiled file explicitly: `./env.js`, `./catalogue/index.js`.
TypeScript enforces this: an extensionless relative import is a type error in those two packages.
`webapp` keeps `moduleResolution: Bundler` because Vite bundles it, and Vite resolves the shared package's `.js` specifiers back to the `.ts` sources.

## Alternatives considered

- Dropping `type: module` from the api so Node uses CommonJS resolution: breaks `import.meta.url`, JSON import attributes and the top level `await` in the scripts, and moves away from the platform default.
- Adding a bundling `build` script (esbuild) so one file ships: adds a build step the Hono preset does not need, and hides resolution problems until deploy.
- Keeping extensionless imports and hoping a future Vercel builder rewrites them: not something to depend on.

## Consequences

- New files in `api` or `packages/shared` must import siblings with a `.js` suffix even though the source is `.ts`. `tsc` fails otherwise, so the mistake cannot reach a deploy.
- Directory imports are spelled out as `/index.js`.
- `tsx`, Vitest and Vite all map `.js` back to `.ts` during development and tests, so nothing changes at runtime locally.
- The webapp's own files are unaffected.
