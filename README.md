# BBT App

A website, its backend, and a native iOS shell that loads the website.

| Project            | Stack                                | Deploys to                   |
| ------------------ | ------------------------------------ | ---------------------------- |
| `webapp/`          | React 19, TypeScript, Vite           | Vercel (static)              |
| `api/`             | Hono, TypeScript, Zod                | Vercel (serverless function) |
| `packages/shared/` | Zod schemas shared by webapp and api | consumed as source           |
| `iosapp/`          | SwiftUI, WKWebView, XcodeGen         | App Store, built on a Mac    |

## Quick start (JavaScript)

```powershell
pnpm install
pnpm dev        # api on http://localhost:3000, webapp on http://localhost:5173
pnpm check      # lint, typecheck, test, build, format check
```

Open http://localhost:5173 and you should see `API: ok`.

## Quick start (iOS, Mac only)

```bash
brew install xcodegen
cd iosapp
xcodegen generate
open BBT.xcodeproj
```

Run the `BBT` scheme in a simulator with `pnpm dev` running; Debug builds load the local webapp.
Release builds load the URL in `iosapp/Config/Release.xcconfig`.

## How they connect

The iOS shell loads the deployed webapp over HTTPS and appends `BBTiOS/<version>` to its user agent.
The webapp calls the api using `VITE_API_URL`.
The api allows the webapp origin via `ALLOWED_ORIGINS`.
Details: `knowledge/architecture.md`.

## Working in this repo

Start with `CLAUDE.md` at the root, then the `CLAUDE.md` of the project you are changing.
Facts live in each `knowledge/` folder, procedures in each `.claude/skills/` folder.
Design specs and plans live in `docs/superpowers/`.
