# API Client

## Where

`src/api/client.ts` is the only file that calls `fetch` against the API.
`src/config.ts` exposes `API_URL` from `VITE_API_URL`, defaulting to `http://localhost:3000`.

## Pattern

One private helper does the work for every endpoint:

```ts
async function getJson<T extends z.ZodType>(path, schema: T, fetchImpl): Promise<z.output<T>>;
```

It builds the URL from `API_URL`, throws on a non 2xx status with the status code in the message, and parses the JSON body with the schema from `@bbt/shared`.
Each public function is one line naming the path and schema:

```ts
export function fetchMenu(fetchImpl: typeof fetch = fetch): Promise<Menu> {
  return getJson('/menu', MenuSchema, fetchImpl);
}
```

Current functions: `fetchHealth`, `fetchStore`, `fetchMenu`.
The `fetchImpl` parameter exists for tests.
Production callers omit it.

## Adding a call

1. Schema and type in `packages/shared/src/`, exported from `index.ts`.
2. Route in `api` (see `api/.claude/skills/add-endpoint`).
3. One line function here calling `getJson`, with a test in `client.test.ts` covering success (and the URL called) and a body that fails the schema.

## CORS

The API only answers origins listed in its `ALLOWED_ORIGINS`.
Locally that is `http://localhost:5173`, which is why the dev server uses a strict port.
