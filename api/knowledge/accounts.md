# Accounts

## The seam

Everything about who a person is goes through one interface, `AccountsProvider` in `src/accounts/types.ts`:

| Method                                     | Does                                              | Failure                                |
| ------------------------------------------ | ------------------------------------------------- | -------------------------------------- |
| `signUp({ email, password, displayName })` | Creates the account and opens a session.          | `AccountsError('email-taken')`         |
| `signIn({ email, password })`              | Opens a session.                                  | `AccountsError('invalid-credentials')` |
| `signOut(token)`                           | Ends that session. Unknown tokens are ignored.    |                                        |
| `resolve(token)`                           | The user and account for a token, or `null`.      |                                        |
| `updateAccount(userId, update)`            | Changes display name, phone and marketing opt in. |                                        |

Routes in `src/routes/auth.ts` and the webapp know only this interface and the shared contract.
Swapping where accounts live or how people authenticate means one new file implementing it and one line in `src/deps.ts`.
See ADR 0017 for why, and for the providers considered next.

## Implementations

| Provider                    | File                          | Used when                                    |
| --------------------------- | ----------------------------- | -------------------------------------------- |
| `createPostgresAccounts`    | `src/accounts/postgres.ts`    | `DATABASE_URL` is set. Production and local. |
| `createUnavailableAccounts` | `src/accounts/unavailable.ts` | No database. Every call answers 503.         |

`createDeps(env)` in `src/deps.ts` picks one, sharing the database connection with the catalogue.

## The Postgres provider

Tables `users` and `sessions` in `src/db/schema.ts`, migration `drizzle/0001_accounts.sql`.

- Emails are trimmed and lower cased by `EmailSchema` before they reach the provider, and `users.email` is unique. A race on sign up surfaces as the same `email-taken` error through the unique violation.
- Passwords are hashed with scrypt (`src/accounts/crypto.ts`), stored as `scrypt$<salt>$<key>`. The prefix lets a stronger scheme coexist later.
- A session token is 32 random bytes, base64url, returned once. The database stores its SHA-256 (`sessions.token_hash`) with `expires_at` 30 days out (`SESSION_TTL_MS`). There is no sliding renewal yet.
- Wrong email and wrong password give the same 401 message so the response does not reveal which emails exist.
- `updateAccount` never touches email, password or `created_at`.
- The seed (`db-seed`) leaves both tables alone. `db-wipe` drops them with everything else.

## Routes

| Route                 | Body                           | Answer                                       |
| --------------------- | ------------------------------ | -------------------------------------------- |
| `POST /auth/sign-up`  | `SignUpRequest`                | 201 `AuthSession`, 400 issues, 409 taken     |
| `POST /auth/sign-in`  | `SignInRequest`                | 200 `AuthSession`, 400 issues, 401 incorrect |
| `POST /auth/sign-out` | bearer token                   | 204 always                                   |
| `GET /auth/me`        | bearer token                   | 200 `MeResponse`, 401 unknown or expired     |
| `PATCH /auth/me`      | bearer token + `AccountUpdate` | 200 `Account`, 400 issues, 401               |

The token travels as `Authorization: Bearer <token>`.
`AccountsError` codes map to statuses in `src/routes/auth.ts`; anything else is a 500 through `onError`.
Without a database every route answers 503 `Accounts need a database. Set DATABASE_URL.`

## Testing

`test/auth.test.ts` runs the routes over the real Postgres provider on PGlite with a controllable clock: sign up, duplicate email, weak password, sign in, wrong password parity, me, expiry, update, sign out, the 503 path, and that reseeding keeps users.
Nothing needs a network.

## Not built yet

Rate limiting on sign in, email verification, password reset, session renewal, and deleting an account.
Each is a provider method plus a route; write the contract in `packages/shared` first.
Ask the `security-engineer` agent to review before real customers sign up.
