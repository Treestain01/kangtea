# API Client

## Where

`src/api/client.ts` is the only file that calls `fetch` against the API.
`src/config.ts` exposes `API_URL` from `VITE_API_URL`, defaulting to `http://localhost:3000`.

## Pattern

Every client function:

1. builds the URL from `API_URL`;
2. throws on a non 2xx status with the status code in the message;
3. parses the JSON body with the matching schema from `@bbt/shared` and returns the inferred type.

```ts
export async function fetchHealth(fetchImpl: typeof fetch = fetch): Promise<HealthResponse> {
  const response = await fetchImpl(`${API_URL}/health`);
  if (!response.ok) throw new Error(`Health check failed with status ${response.status}`);
  return HealthResponseSchema.parse(await response.json());
}
```

The `fetchImpl` parameter exists for tests.
Production callers omit it.

## Adding a call

1. Schema and type in `packages/shared/src/`, exported from `index.ts`.
2. Route in `api` (see `api/.claude/skills/add-endpoint`).
3. Function here following the pattern above, with a test in `client.test.ts` covering success, non 2xx, and a body that fails the schema.

## CORS

The API only answers origins listed in its `ALLOWED_ORIGINS`.
Locally that is `http://localhost:5173`, which is why the dev server uses a strict port.
