# API Client

## Where

`src/api/client.ts` is the only file that calls `fetch` against the API.
`src/config.ts` exposes `API_URL` from `VITE_API_URL`, defaulting to `http://localhost:3000`.

## Pattern

Two private helpers do the work for every endpoint:

```ts
async function request(path, { method, body, token, fetchImpl }): Promise<Response>;
async function requestJson<T extends z.ZodType>(path, schema: T, options): Promise<z.output<T>>;
```

`request` builds the URL from `API_URL`, sends JSON when there is a body and `Authorization: Bearer <token>` when there is a token, and throws `ApiError` on a non 2xx status.
`ApiError` carries `status`, the api's `error` message when it sent one (otherwise `<METHOD> <path> failed with status <n>`), and any Zod `issues`.
`requestJson` parses the body with the schema from `@bbt/shared`.
Each public function is a few lines naming the path, schema and method:

```ts
export function fetchMenu(fetchImpl: typeof fetch = fetch): Promise<Menu> {
  return requestJson('/menu', MenuSchema, { fetchImpl });
}
```

Current functions: `fetchHealth`, `fetchStore`, `fetchMenu`, `signUp`, `signIn`, `signOut`, `fetchMe`, `updateAccount`.
Pages never call the auth functions directly; `src/auth/apiAuthClient.ts` wraps them (see `accounts.md`).
The `fetchImpl` parameter exists for tests.
Production callers omit it.

## Loading once, caching for the tab

`src/api/CatalogueProvider.tsx` wraps the app in `main.tsx` and loads the store and the menu once.
`useCatalogue()` returns `{ catalogue, retry }` where `catalogue` is `loading`, `error` or `ready`; `useStoreInfo()` returns just the store or null.
Home, Menu, the app shell's pickup card, the order panel and the Account page all read from it, so switching tabs sends no requests.
The loaded pair is written to `sessionStorage` under `kangtea.catalogue`, validated with the shared schemas on read, so a reload in the same tab paints from the cache with no request and a new tab fetches fresh.
`retry` always fetches and rewrites the cache.
Tests render inside `<CatalogueProvider storage={null}>` so every test starts from its mocked fetches.
This is the one place outside `store/local.ts` that touches browser storage, and it only ever holds public menu data.

## Adding a call

1. Schema and type in `packages/shared/src/`, exported from `index.ts`.
2. Route in `api` (see `api/.claude/skills/add-endpoint`).
3. A function here calling `requestJson`, with a test in `client.test.ts` covering success (URL, method and headers) and a body that fails the schema.

## CORS

The API only answers origins listed in its `ALLOWED_ORIGINS`.
Locally that is `http://localhost:5173`, which is why the dev server uses a strict port.
