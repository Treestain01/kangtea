# Architecture

## The four pieces

```
 iPhone                                  Browser
 +------------------+                    +------------------+
 | iosapp (shell)   |                    | any browser      |
 |  WKWebView  -----+---- https ----+----+---> webapp       |
 |  UA: ... BBTiOS/x|               |    +------------------+
 +------------------+               |
                                    v
                          +------------------+        +------------------+        +------------------+
                          | webapp (Vercel)  | -----> | api (Vercel)     | -----> | Postgres (Neon   |
                          | React + Vite     |  CORS  | Hono + Drizzle   |   pg   |  via Vercel)     |
                          +------------------+        +------------------+        +------------------+
                                    ^                          ^                          ^
                                    |   packages/shared        |                          |
                                    +------- Zod contract -----+          seed.json ------+
```

- `webapp` is a static site. It calls `api` over HTTPS using the base URL in `VITE_API_URL`.
- `api` is one Vercel serverless function. Every route is mounted on a single Hono app.
- `api` reads the catalogue from Postgres when `DATABASE_URL` is set and from `seed.json` at the repository root otherwise. See `api/knowledge/database.md`.
- `seed.json` is the base template for every database environment. The root skills `db-seed` and `db-wipe` load and empty a database.
- Accounts live in the same database behind `api/src/accounts/types.ts#AccountsProvider`; the webapp signs in through `webapp/src/auth/AuthClient.ts` and sends an opaque bearer token. Both are swap points for a hosted auth provider (ADR 0017).
- `packages/shared` is TypeScript source consumed directly by both. There is no build step.
- `iosapp` loads `webapp` from `WEBAPP_URL`. It never calls `api` directly and never bundles web assets.

## URL configuration flow

| Consumer | Setting                                                               | Development value         | Production value              |
| -------- | --------------------------------------------------------------------- | ------------------------- | ----------------------------- |
| `webapp` | `VITE_API_URL` (Vercel env var, `.env` locally)                       | `http://localhost:3000`   | deployed api URL              |
| `api`    | `ALLOWED_ORIGINS` (Vercel env var, `.env` locally)                    | `http://localhost:5173`   | deployed webapp origin        |
| `api`    | `DATABASE_URL` (set by the Vercel Neon integration, `.env` locally)   | unset, serves `seed.json` | pooled Neon connection string |
| `iosapp` | `WEBAPP_URL` in `Config/Debug.xcconfig` and `Config/Release.xcconfig` | `http://localhost:5173`   | deployed webapp URL           |

`WEBAPP_URL` flows from the xcconfig into `Info.plist` as `$(WEBAPP_URL)` and is read at runtime by `AppConfig.load()`.
xcconfig treats `//` as a comment, so URLs are written `https:/$()/host`.

## User agent contract

The shell sets `WKWebViewConfiguration.applicationNameForUserAgent` so the user agent ends with `Mobile/<build> BBTiOS/<app version>`.
The webapp's `isInIosShell()` in `webapp/src/platform.ts` checks for the `BBTiOS/` token.
The webapp must work identically when the token is absent.
Changing the token means changing `AppConfig.userAgentProduct` in Swift and `IOS_SHELL_USER_AGENT_TOKEN` in TypeScript together.

## CORS

`api` allows only the origins listed in `ALLOWED_ORIGINS`.
Requests from inside the shell carry the webapp's origin, because the webview is loading the webapp, so no iOS specific origin is needed.

## Safe areas

`ContentView` places the webview edge to edge with `ignoresSafeArea()`.
`webapp/index.html` sets `viewport-fit=cover` and `styles.css` pads `body` with `env(safe-area-inset-*)`.
This keeps layout control in one place: CSS.

## Loading and failure

The shell has no bundled content.
`WebViewModel` tracks `loading`, `loaded` and `failed(message:)`.
`ContentView` overlays a spinner while loading and `OfflineView` with a retry button on failure.

## Extension points

- JavaScript to Swift bridge: `WebView.makeUIView` has a marked spot to add a `WKScriptMessageHandler`. Define the message schema in `packages/shared` first.
- New API routes: create a router in `api/src/routes/`, mount it in `api/src/create-app.ts`, define the schema in `packages/shared`.
- Second JS package: add it to `pnpm-workspace.yaml` and extend `tsconfig.base.json`.
