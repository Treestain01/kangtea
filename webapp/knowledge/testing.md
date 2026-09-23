# Testing

## Layout

Tests sit beside the code: `src/platform.test.ts`, `src/components/ApiStatus.test.tsx`.
`src/test/setup.ts` registers jest-dom matchers for every test.

## Patterns

- Render with `render(<Thing />)` and query with `screen.getByRole`, `screen.findByText` and `screen.queryByText`.
  Use `findBy*` when the UI updates after a promise.
- Mock the API client, not `fetch`: `vi.mock('../api/client', () => ({ fetchHealth: vi.fn() }))` then `vi.mocked(fetchHealth).mockResolvedValue(...)`.
- Pure functions (`platform.ts`, `api/client.ts`) are tested directly.
  `fetchHealth` accepts a `fetchImpl` parameter so tests pass a fake instead of patching globals.

## What to test

- Every branch of a component's rendered state (loading, ok, error).
- Every exported pure function.
- Contract handling: a response that fails the shared schema must throw, and the UI must show the error state.

## What not to test

- Styling and layout. Check those in the browser with the `add-feature` skill.
- Vite or React internals.
