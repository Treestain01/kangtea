# 0004 Hono on Vercel for the api

Date: 2026-09-23
Status: Superseded by 0013

## Context

The backend must be TypeScript, host on Vercel next to the webapp, and be easy to test.

## Decision

Hono, exposed as one Vercel serverless function through `hono/vercel`, with `@hono/node-server` for local development.
Zod validates every request boundary.

## Alternatives considered

- Express: heavier, weaker TypeScript types, awkward on Vercel functions.
- Next.js API routes: pulls in a framework we use nowhere else.
- Bare Vercel functions: no routing or middleware story, so each endpoint reinvents it.

## Consequences

- Tests call `app.request()` in process and are fast.
- There is intentionally no `build` script in `api/package.json`; Vercel compiles the function itself.
- Long running work must move to a queue or a different host; serverless functions have execution limits.
