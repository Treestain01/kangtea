# 0001 Monorepo with pnpm workspaces

Date: 2026-09-23
Status: Accepted

## Context

The product has a website, a backend and a native iOS shell that must evolve together but deploy separately.
The website and backend share a request and response contract that must not drift.

## Decision

One git repository with a pnpm workspace for the JavaScript packages (`webapp`, `api`, `packages/*`) and a sibling `iosapp` directory outside the workspace.
Root level tooling (TypeScript base config, ESLint, Prettier, Vitest) is shared by every JS package.
No build orchestrator (Turborepo, Nx) until there are enough packages to need one.

## Alternatives considered

- Separate repositories: contract drift between webapp and api would be invisible until runtime, and agents would need to coordinate across repos.
- Turborepo from day one: adds a caching layer and config for three small packages that build in seconds.

## Consequences

- One `pnpm check` verifies everything JS.
- Vercel needs two projects pointing at the same repo with different root directories.
- Adding an orchestrator later is a contained change to root `package.json` scripts.
