# BBT App Monorepo Design

Date: 2026-09-23
Status: Approved for implementation

## 1. Purpose

Create a monorepo for the BBT product with three independently deployable projects and the agent infrastructure needed to work on them reliably.

- `webapp`: a standalone React + TypeScript website, hosted on Vercel.
- `api`: a TypeScript backend for the webapp, hosted on Vercel.
- `iosapp`: a native Swift iOS shell that loads the deployed `webapp` in a `WKWebView`.
- `packages/shared`: the typed API contract shared by `webapp` and `api`.

Users can use the website directly or through the iOS app.
Each project builds and deploys on its own.
No project bundles another project's output.

## 2. Constraints and context

- Development happens on Windows.
  The iOS project can be authored here but only built and run on a Mac with Xcode.
- Node 25, npm 11, pnpm 10 and git 2.51 are installed locally.
  The repo pins Node 22 via `.nvmrc` to match Vercel's runtime.
- All development work on this repo is routed through Tristan's agency at `C:\Users\trist\OneDrive\Desktop\tristans-agency`.
  At the time of writing only the macOS `._*` sidecar files of the agency are synced to this machine.
  The routing in this spec is derived from the agent roster and skill names visible in that tree.
- Tristan's global instructions apply: no em dashes, one sentence per line in long Markdown, no agent co-author lines in commits, quality over development cost.

## 3. Repository layout

```
bbtapp/
├── .editorconfig
├── .gitignore
├── .nvmrc                          # 22
├── CLAUDE.md                       # repo map, agency routing, cross-project rules
├── README.md                       # human-facing overview and quick start
├── package.json                    # pnpm workspace root, fan-out scripts
├── pnpm-workspace.yaml             # webapp, api, packages/*
├── .claude/skills/                 # repo-level skills
├── knowledge/                      # repo-level knowledge base
├── docs/superpowers/specs/         # design specs (this file)
├── packages/shared/                # API contract (Zod schemas + types)
├── webapp/                         # React + TS website
├── api/                            # Hono + TS backend
└── iosapp/                         # Swift shell, XcodeGen
```

### 3.1 Root tooling

- pnpm workspace with `packages: ["webapp", "api", "packages/*"]`.
- Root `package.json` scripts fan out to every workspace: `lint`, `typecheck`, `test`, `build`, `check` (all of the above in order).
- No monorepo orchestrator (Turborepo, Nx) yet.
  Add one when build times or package count justify it.
- Shared root `.editorconfig`, `.prettierrc`, and a base `tsconfig.base.json` that `webapp`, `api` and `packages/shared` extend.
- `.gitignore` covers Node, Vite, Vercel (`.vercel/`), Xcode (`*.xcodeproj`, `xcuserdata`, `DerivedData`), and macOS files.

## 4. Projects

### 4.1 `webapp`

Stack: Vite, React 19, TypeScript (strict), ESLint (typescript-eslint, react-hooks), Prettier, Vitest, React Testing Library.

- Scaffolded from the Vite `react-ts` template and tightened to the shared conventions.
- `pnpm build` produces a static `dist/` deployable to any host.
  Nothing in the build is iOS specific.
- `src/platform.ts` exposes `isInIosShell()` by checking the user agent for the `BBTiOS/<version>` suffix appended by `iosapp`.
  The site behaves identically when the suffix is absent.
- `index.html` sets `viewport-fit=cover` and the stylesheet uses `env(safe-area-inset-*)` so the page renders correctly edge to edge inside the webview.
- Reads `VITE_API_URL` for the `api` base URL.
  Defaults to `http://localhost:3000` in development.
- `vercel.json` contains the single-page-app rewrite to `index.html`.
- One smoke test asserts the app renders and one unit test covers `isInIosShell()`.

### 4.2 `api`

Stack: Hono, TypeScript (strict), Zod, ESLint, Prettier, Vitest, `@hono/node-server` and `tsx` for local development.

Layout:

```
api/
├── api/index.ts          # Vercel entrypoint: export default handle(app)
├── src/app.ts            # Hono app: middleware, route mounting
├── src/routes/health.ts  # GET /health
├── src/server.ts         # local dev server on port 3000
├── src/env.ts            # Zod-validated environment access
├── vercel.json           # rewrite every path to /api/index
└── test/                 # Vitest tests using app.request()
```

- Every request boundary is validated with Zod schemas imported from `packages/shared`.
- Responses are typed against `packages/shared` response schemas.
- CORS allowlist comes from the `ALLOWED_ORIGINS` environment variable (comma separated).
  Development defaults to `http://localhost:5173`.
- The iOS shell never calls `api` directly.
  The webview loads `webapp`, whose origin is what CORS sees.
- Local development runs with `pnpm dev` (`tsx watch src/server.ts`) and needs no Vercel login.
- Tests call `app.request()` in-process and never open a port.

### 4.3 `packages/shared`

- Package name `@bbt/shared`.
- Holds Zod schemas and inferred TypeScript types for API requests and responses.
- Starts with `HealthResponse` only.
- Has no build step.
  Its `package.json` exports `./src/index.ts` directly, so Vite, tsx, Vitest, `tsc --noEmit` and Vercel's function bundler all consume the TypeScript source.
  This avoids every consumer and both Vercel projects having to build `shared` first.
  `webapp` and `api` depend on it via `workspace:*`.
- Rule: any change to an API shape starts here, then `api`, then `webapp`.

### 4.4 `iosapp`

Stack: Swift 5.10, SwiftUI, iOS 17 minimum, XcodeGen.

Layout:

```
iosapp/
├── project.yml                    # XcodeGen manifest, target BBT
├── Config/Debug.xcconfig          # WEBAPP_URL = http://localhost:5173
├── Config/Release.xcconfig        # WEBAPP_URL = https://REPLACE_WITH_PRODUCTION_URL
├── BBT/
│   ├── BBTApp.swift               # @main entry
│   ├── ContentView.swift          # hosts WebView edge to edge
│   ├── WebView.swift              # UIViewRepresentable around WKWebView
│   ├── WebViewModel.swift         # loading, loaded, failed(Error) state
│   ├── AppConfig.swift            # reads WEBAPP_URL from Info.plist
│   ├── Info.plist                 # WEBAPP_URL = $(WEBAPP_URL), NSAllowsLocalNetworking
│   └── Assets.xcassets/
└── BBTTests/
    └── AppConfigTests.swift       # URL parsing and user agent suffix
```

- Display name `BBT`, bundle identifier `com.tristanjong.bbtapp`.
- `BBT.xcodeproj` is generated by `xcodegen generate` on a Mac and is gitignored.
- The web URL is never hardcoded in Swift.
  It flows from `.xcconfig` into `Info.plist` and is read by `AppConfig` at runtime.
- `WebView` appends `BBTiOS/<app version>` to the default user agent.
- `WebView` shows a loading indicator while the first navigation is in flight and an offline or error view with a retry button when navigation fails.
  Because the app has no bundled content, this state is required from day one.
- `ContentView` ignores safe areas so the webapp controls insets via CSS.
- `NSAppTransportSecurity` sets `NSAllowsLocalNetworking` so the simulator can reach the Vite dev server over plain HTTP.
  A single `Info.plist` cannot vary by build configuration without duplicating the file, and this key only affects local hosts, so it applies to all configurations.
- `.xcconfig` values containing `//` must be written as `https:/$()/host` because `//` starts a comment in xcconfig syntax.
- No JavaScript to Swift message bridge exists yet.
  `WebView.swift` has a clearly marked extension point (`WKUserContentController`) for adding one.

## 5. Agent infrastructure

Three layers, each with one job.

- `CLAUDE.md`: always-loaded rules and pointers, kept under about 60 lines.
- `knowledge/`: durable facts read on demand, each folder fronted by an `INDEX.md` with one line per document.
- `.claude/skills/`: repeatable procedures in `SKILL.md` files with `name` and `description` frontmatter whose description starts with "Use when".

Every project has all three.
The root ties them together.

### 5.1 Root

`CLAUDE.md` sections: Purpose, Repo map, Who does the work (agency routing), Commands, Rules, Where to look.

Rules include:

- Read `knowledge/INDEX.md` before changing anything you do not already understand.
- If you changed how something works, update the relevant knowledge document in the same change.
- API shape changes start in `packages/shared`.
- Never commit `.xcodeproj`, `.vercel/`, or `.env` files.
- Verify with `pnpm check` at the root before declaring work done, and report failures faithfully.

Skills:

- `verify-all`: runs `pnpm check` across the workspace, states what could not be verified (iOS), and reports faithfully.
- `record-decision`: writes a numbered ADR into `knowledge/decisions/` using the shared template and updates the index.
- `update-knowledge`: how to decide which knowledge document a change affects and how to update it and its index.

Knowledge:

- `INDEX.md`
- `architecture.md`: how the four pieces connect, including the URL configuration flow, the user agent contract, CORS, and the shared contract package.
- `conventions.md`: commits, branching, formatting, one sentence per line, no em dashes, TDD expectation.
- `glossary.md`
- `decisions/0001-monorepo-with-pnpm-workspaces.md`
- `decisions/0002-ios-shell-loads-remote-webapp.md`
- `decisions/0003-xcodegen-for-ios-project.md`
- `decisions/0004-hono-on-vercel-for-api.md`
- `decisions/0005-shared-contract-package.md`

### 5.2 Agency routing

The root `CLAUDE.md` states that all development work on this repo is done through the agency at `C:\Users\trist\OneDrive\Desktop\tristans-agency`.
Agents read the agency's `CLAUDE.md` and `orchestration.md` first, then adopt the matching agent definition and its skills.

| Work | Agent |
|---|---|
| Structure, cross-project decisions, ADRs, new subsystems | `architect` |
| `webapp` UI, components, state, browser verification | `front-end-engineer` |
| `api` endpoints, data modelling, `packages/shared` contract | `back-end-engineer` |
| `iosapp` Swift, SwiftUI, WKWebView | `front-end-engineer` for UI, `architect` for the shell to web contract |
| Vercel deployment, PR creation, addressing review | `delivery-engineer` |
| Acceptance criteria, end to end behaviour verification | `acceptance-verification-engineer` |
| Test strategy, PR correctness review | `qa-engineer` |
| Auth, secrets, CORS, threat modelling, security review | `security-engineer` |
| `CLAUDE.md`, knowledge bases, READMEs, doc rot audits | `technical-writer` |
| Analytics and event modelling | `data-engineer` |
| Visual design, design system alignment | `ui-ux-designer` |
| Scoping, prioritisation, requirements | `product-manager` |
| Coordinating multi-agent work, sequencing | `engineering-manager` |

Cross-cutting rule: any change that touches the `webapp` to `api` boundary involves both `front-end-engineer` and `back-end-engineer` through the `coordinate-api-contract` skill.

Known gap: the agency has no dedicated iOS agent.
This is recorded in the root `CLAUDE.md` so the gap is visible rather than silently worked around.

### 5.3 `webapp`

- `CLAUDE.md`: stack, commands, TDD rule, never break the static build, how to run against a local `api`.
- Skills: `add-feature` (test first, component, lint, typecheck, verify in browser), `check` (lint, typecheck, test, build, and what green means).
- Knowledge: `INDEX.md`, `stack.md`, `testing.md`, `ios-integration.md` (user agent suffix, viewport, safe areas, what the shell does and does not do), `api-client.md` (how the webapp calls `api` using the shared contract).

### 5.4 `api`

- `CLAUDE.md`: stack, commands, validate every boundary with Zod, contract changes start in `packages/shared`, local run instructions.
- Skills: `add-endpoint` (schema in shared, failing test, route, CORS check, docs), `check`, `run-local`.
- Knowledge: `INDEX.md`, `stack.md`, `routing-and-validation.md`, `deployment.md` (Vercel project setup, root directory, environment variables, rewrites).

### 5.5 `iosapp`

- `CLAUDE.md`: Swift and SwiftUI rules, never commit `.xcodeproj`, URLs only via `.xcconfig`, cannot be built on Windows.
- Skills: `regenerate-project` (xcodegen generate, open, build in simulator), `point-at-webapp` (switch `WEBAPP_URL` between local, staging and production).
- Knowledge: `INDEX.md`, `project-generation.md`, `webview.md` (setup, states, where a JS bridge would go), `configuration.md` (xcconfig to Info.plist to runtime).

### 5.6 `packages/shared`

- `CLAUDE.md`: purpose, the rule that shape changes start here, how to build and how consumers pick up changes.
- No skills or knowledge folder yet.
  The package is small enough that its `CLAUDE.md` and source are the documentation.

## 6. Deployment

- Two Vercel projects are created from the same git repository.
  One has root directory `webapp`, the other `api`.
- Vercel installs with pnpm and builds `packages/shared` as part of each project's install because of the workspace dependency.
- `webapp` environment: `VITE_API_URL`.
- `api` environment: `ALLOWED_ORIGINS`.
- `iosapp` Release configuration points `WEBAPP_URL` at the deployed `webapp` URL.
- No Vercel project configuration is committed beyond the two `vercel.json` files.

## 7. Verification

- `webapp`, `api` and `packages/shared` are fully verified locally: lint, typecheck, tests, build, and the webapp loaded in a browser against the local api.
- `iosapp` cannot be built on Windows.
  It is verified by inspection here and the README gives the exact Mac steps.
  Implementation reports must state this explicitly.
- Every project ships with at least one passing test so `pnpm check` is meaningful from the first commit.

## 8. Out of scope

- JavaScript to Swift bridge.
- Authentication, database, or any real domain endpoints.
- Custom subagents in `.claude/agents/` and hooks.
- Turborepo or other build orchestration.
- CI configuration.
  Vercel builds on push cover deployment; a GitHub Actions workflow for `pnpm check` can follow once the repo has a remote.
- App Store assets, signing, and provisioning.
