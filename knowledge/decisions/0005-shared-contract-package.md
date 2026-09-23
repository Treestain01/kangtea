# 0005 Shared contract package

Date: 2026-09-23
Status: Accepted

## Context

`webapp` and `api` agree on request and response shapes.
Duplicated types drift silently.

## Decision

`packages/shared` (`@bbt/shared`) holds Zod schemas and their inferred types.
`api` parses outgoing responses with them, `webapp` parses incoming responses with them.
The package exports TypeScript source directly (`exports: "./src/index.ts"`) and has no build step.

## Alternatives considered

- Duplicate types in each package: drift is the problem being solved.
- Build shared to `dist` with `tsc`: forces a build ordering on every consumer and on both Vercel projects for no runtime benefit.
- Generate types from an OpenAPI document: worthwhile later if external clients appear.

## Consequences

- Any API shape change starts in `packages/shared`, and TypeScript fails in whichever consumer is not updated.
- Consumers must be able to compile TypeScript from `node_modules`. Vite, tsx, Vitest, `tsc` and Vercel's function bundler all can.
