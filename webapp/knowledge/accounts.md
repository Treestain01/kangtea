# Accounts and Sign In

## The seam

`src/auth/AuthClient.ts` is the interface the webapp uses to sign people in and read their account: `signUp`, `signIn`, `signOut`, `me`, `updateAccount`.
`src/auth/apiAuthClient.ts` implements it over our api's `/auth` routes through `api/client.ts`.
A hosted provider with its own SDK becomes another implementation; nothing outside `src/auth/` would change.
See ADR 0017.

## AuthProvider and useAuth

`src/auth/AuthProvider.tsx` wraps the router in `main.tsx` with the `apiAuthClient`.
`useAuth()` gives pages:

| Member                  | Does                                                                    |
| ----------------------- | ----------------------------------------------------------------------- |
| `session`               | `AuthSession` or `null`. Includes `token`, `user` and `account`.        |
| `signUp(input)`         | Calls the client and saves the returned session.                        |
| `signIn(input)`         | Same, for an existing account.                                          |
| `signOut()`             | Clears the session first, then tells the api; a failed call is ignored. |
| `updateAccount(update)` | Saves the returned `Account` into the session.                          |

On start, if a session is stored, the provider calls `me(token)`.
A 401 clears the session (expired or revoked); any other failure keeps it so an offline start does not sign people out.

Errors thrown by the client are `ApiError` from `api/client.ts` with `status` and the api's message.
Pages show `error.message` for an `ApiError` and a generic connection message otherwise.

## Where the session lives

`store/types.ts#SessionStore`, key `kangtea.session`, validated with `AuthSessionSchema` like every other store.
It replaced the local only `AccountStore`: the api owns the profile now and the store holds the device's copy.
`useSession()` in `store/hooks.ts` reads it directly; pages should prefer `useAuth()`.

The bearer token therefore sits in `localStorage`.
That is acceptable while the webapp loads no third party script; a hosted provider with short lived tokens is the way to tighten it.

## The Account page

`pages/AccountPage.tsx`:

- Signed out: the `SignInCard`, one card with two chips (`Sign in`, `Create account`) and one form named after its heading. Field errors come from the shared request schemas before anything is sent; api messages ("That email is already registered", "Email or password is incorrect") show in a `role="alert"`.
- Signed in: the `ProfileForm` saves name, mobile and the marketing opt in through `updateAccount`, shows the signed in email, and has `Sign out`.
- Appearance, the store card and `Your data` are the same for both. `Clear my data` empties cart and orders and signs out; the theme choice stays.

## Testing

`src/auth/testing.ts#createFakeAuthClient()` is an in memory `AuthClient` with the api's status codes and an `expireAll()` switch.
Page tests render inside `StoresProvider` and `AuthProvider` with the fake; `client.test.ts` covers the real calls with a fake `fetch`.
