# 0017 Accounts behind a provider interface

Date: 2026-09-27
Status: Accepted

## Context

Tristan asked for real user accounts, held "through Vercel" for now, with the ability to move to a different authentication or account database later without a rewrite.
The profile used to be a local only record on the device (ADR 0009).
The api already owned a Postgres database on Vercel through the Neon integration (ADR 0012).

## Decision

Accounts live in our own Postgres tables (`users`, `sessions`) in the Neon database attached to the Vercel api project.
Two interfaces are the swap points:

- `AccountsProvider` in `api/src/accounts/types.ts`: sign up, sign in, sign out, resolve a token, update the account. `createPostgresAccounts` is the only implementation today; `createUnavailableAccounts` stands in without a database.
- `AuthClient` in `webapp/src/auth/AuthClient.ts`: the same operations from the browser's side. `apiAuthClient` talks to our api; pages only use `useAuth()`.

Authentication is email and password. Passwords are hashed with scrypt from `node:crypto`; sessions are opaque 256 bit tokens, stored as SHA-256 hashes, valid for 30 days, sent as `Authorization: Bearer`.
The webapp keeps the session (token, user, account) in its store layer under `kangtea.session` and revalidates it against `/auth/me` on start.
The shared contract gained `UserSchema`, `SignUpRequestSchema`, `SignInRequestSchema`, `AccountUpdateSchema`, `MeResponseSchema` and `AuthSessionSchema`.

## Alternatives considered

- Neon Auth (the hosted service the integration also provisioned): would remove password handling from the api, but its client SDK would bypass the api and the contract, and the webapp would couple to a vendor SDK on day one. It remains the most likely next `AccountsProvider`.
- Clerk or another Marketplace provider: same shape of trade off, plus a second vendor.
- Better Auth self hosted inside Hono: strong library, but it wants to own the routes and the schema, which fights the provider interface rather than sitting behind it.
- Cookies instead of a bearer token: the webapp and api are different sites under `vercel.app`, so Safari would drop the cookie. A bearer token in the store layer works everywhere, including the iOS shell.
- Keeping the profile local and only adding login: leaves two sources of truth for the same fields.

## Consequences

- Moving providers means one new file per side implementing the interface, plus wiring in `api/src/deps.ts` and `webapp/src/main.tsx`. Routes, pages and the contract stay.
- Every `/auth` route parses input and output against the shared contract; `AccountsError` codes map to 409, 401 and 503, everything else is a 500.
- The seed never touches `users` or `sessions`; only `db-wipe` does. A wipe signs everyone out and deletes every account.
- Not yet built, and needed before real customers: rate limiting on sign in, email verification, password reset, and sliding session renewal. The `security-engineer` agent should review before launch.
- The bearer token lives in `localStorage`; an XSS in the webapp would expose it. The token guard tests and the tokens only CSS keep third party script out, but this is the reason to prefer a hosted provider with short lived tokens later.
