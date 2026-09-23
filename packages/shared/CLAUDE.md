# packages/shared (`@bbt/shared`)

## Purpose

The contract between `webapp` and `api`: Zod schemas and their inferred TypeScript types.
If a shape lives here, neither side can drift without TypeScript or a runtime parse failing.

## Commands

- `pnpm --filter @bbt/shared test|lint|typecheck`.
- There is no build. `package.json` exports `./src/index.ts` and every consumer compiles the source.

## Rules

- Any API shape change starts here, then `api`, then `webapp`.
- One file per resource in `src/`, re-exported from `src/index.ts` with explicit `export { Schema }` and `export type { Type }` lines.
- Every schema has a test in `test/` with at least one passing and one failing example.
- Use `z.iso.datetime()` for timestamps, `z.literal` for fixed strings, and never `z.any()`.
- Only `zod` may be a dependency. This package must stay free of runtime side effects.
- Do not add a build step. See root `knowledge/decisions/0005-shared-contract-package.md`.

## Where to look

- Root `knowledge/architecture.md` for how the contract is used on both sides.
- `api/.claude/skills/add-endpoint` for the contract-first flow.
- Agency agent: `back-end-engineer` (see root `CLAUDE.md`).
