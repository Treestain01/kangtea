# BBT App Monorepo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the `bbtapp` monorepo with `webapp` (React), `api` (Hono), `packages/shared` (Zod contract), `iosapp` (SwiftUI + WKWebView shell), and the CLAUDE.md, knowledge base and skills that make it reliable for agents.

**Architecture:** A pnpm workspace holds three TypeScript packages that share one contract package and one set of root tooling (TypeScript, ESLint, Prettier, Vitest). `iosapp` is a Swift project described by an XcodeGen `project.yml` that loads the deployed `webapp` URL from an `.xcconfig`. Every project carries a short `CLAUDE.md`, a `knowledge/` folder fronted by `INDEX.md`, and `.claude/skills/`.

**Tech Stack:** pnpm 10, Node 22 (Vercel runtime; local Node 25 is fine), TypeScript, Vite, React 19, Hono 4, Zod 4, Vitest, React Testing Library, ESLint 9 flat config, Prettier, Swift 5.10, SwiftUI, WebKit, XcodeGen.

**Spec:** `docs/superpowers/specs/2026-09-23-bbtapp-monorepo-design.md`

## Global Constraints

- Development machine is Windows. `iosapp` cannot be built here; verify it by inspection and by parsing its YAML, XML and JSON files. Every report must say so.
- Node pinned to `22` in `.nvmrc`. Local Node 25 runs everything fine.
- Package names: `@bbt/shared`, `@bbt/api`, `@bbt/webapp`. Root package `bbtapp`.
- Ports: `webapp` dev server `5173`, `api` dev server `3000`.
- iOS: display name `BBT`, bundle id `com.tristanjong.bbtapp`, iOS 17 minimum, Swift 5.10, user agent suffix `BBTiOS/<version>`.
- `packages/shared` has no build step; its `exports` point at `./src/index.ts`.
- Markdown files: no em dashes (use `-`), one sentence per line in long documents.
- Commit messages: plain, no agent co-author lines. Commit as the configured git user.
- Never commit `*.xcodeproj`, `.vercel/`, `.env` (except `.env.example`), `node_modules`, `dist`.
- Line endings are LF everywhere, enforced by `.gitattributes`.
- Do not pin exact dependency versions in the plan; `pnpm add` records the resolved caret ranges in each `package.json`.
- All shell commands below are PowerShell unless marked otherwise. Run them from `D:\repos\bbtapp`.

---

## File Structure

```
bbtapp/
├── .claude/skills/{verify-all,record-decision,update-knowledge}/SKILL.md
├── .editorconfig
├── .gitattributes
├── .gitignore
├── .nvmrc
├── .prettierignore
├── .prettierrc
├── CLAUDE.md
├── README.md
├── eslint.config.mjs
├── knowledge/{INDEX,architecture,conventions,glossary}.md
├── knowledge/decisions/{TEMPLATE,0001..0005}.md
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── packages/shared/{package.json,tsconfig.json,CLAUDE.md}
├── packages/shared/src/{index,health}.ts
├── packages/shared/test/health.test.ts
├── api/{package.json,tsconfig.json,vercel.json,.env.example,CLAUDE.md}
├── api/api/index.ts
├── api/src/{app,env,server}.ts
├── api/src/routes/health.ts
├── api/test/{app,env}.test.ts
├── api/.claude/skills/{add-endpoint,check,run-local}/SKILL.md
├── api/knowledge/{INDEX,stack,routing-and-validation,deployment}.md
├── webapp/{package.json,tsconfig.json,vite.config.ts,vercel.json,index.html,.env.example,CLAUDE.md}
├── webapp/src/{main.tsx,App.tsx,config.ts,platform.ts,styles.css,vite-env.d.ts}
├── webapp/src/api/client.ts
├── webapp/src/components/ApiStatus.tsx
├── webapp/src/test/setup.ts
├── webapp/src/{platform,App}.test.ts(x)
├── webapp/src/api/client.test.ts
├── webapp/src/components/ApiStatus.test.tsx
├── webapp/.claude/skills/{add-feature,check}/SKILL.md
├── webapp/knowledge/{INDEX,stack,testing,ios-integration,api-client}.md
├── iosapp/{project.yml,CLAUDE.md}
├── iosapp/Config/{Debug,Release}.xcconfig
├── iosapp/BBT/{BBTApp,ContentView,WebView,WebViewModel,AppConfig,StatusViews}.swift
├── iosapp/BBT/Info.plist
├── iosapp/BBT/Assets.xcassets/{Contents.json,AppIcon.appiconset/Contents.json,AccentColor.colorset/Contents.json}
├── iosapp/BBTTests/AppConfigTests.swift
├── iosapp/.claude/skills/{regenerate-project,point-at-webapp}/SKILL.md
└── iosapp/knowledge/{INDEX,project-generation,webview,configuration}.md
```

Responsibilities:

- Root config files own formatting, linting and TypeScript defaults for every JS package. Packages only override what differs.
- `packages/shared/src/health.ts` owns the health contract. Everything else imports it.
- `api/src/env.ts` is the only place that reads `process.env`.
- `api/src/app.ts` builds the Hono app from an `Env`; `server.ts` and `api/index.ts` are thin adapters.
- `webapp/src/config.ts` is the only place that reads `import.meta.env`.
- `webapp/src/api/client.ts` is the only place that calls `fetch` against the API.
- `iosapp/BBT/AppConfig.swift` is the only place that reads `Info.plist`.
- `iosapp/BBT/WebView.swift` owns WebKit; `WebViewModel.swift` owns loading state; `ContentView.swift` composes them.

---

### Task 1: Root workspace skeleton

**Files:**
- Create: `.gitattributes`, `.gitignore`, `.editorconfig`, `.nvmrc`, `.prettierrc`, `.prettierignore`, `tsconfig.base.json`, `eslint.config.mjs`, `package.json`, `pnpm-workspace.yaml`

**Interfaces:**
- Produces: root scripts `pnpm build|lint|typecheck|test|check|dev|format|format:check`; `tsconfig.base.json` that every package extends; a root ESLint flat config that applies to every package.

- [ ] **Step 1: Create `.gitattributes`**

```gitattributes
* text=auto eol=lf
*.png binary
*.jpg binary
*.ico binary
```

- [ ] **Step 2: Create `.gitignore`**

```gitignore
# Node
node_modules/
dist/
coverage/
*.log
.pnpm-store/

# Environment
.env
.env.*
!.env.example

# Vercel
.vercel/

# Xcode (generated by xcodegen, never committed)
*.xcodeproj
*.xcworkspace
xcuserdata/
DerivedData/
*.xcuserstate

# OS
.DS_Store
._*
Thumbs.db

# Editors
.idea/
.vscode/
```

- [ ] **Step 3: Create `.editorconfig`**

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true
indent_style = space
indent_size = 2

[*.swift]
indent_size = 4

[*.md]
trim_trailing_whitespace = false
```

- [ ] **Step 4: Create `.nvmrc`, `.prettierrc`, `.prettierignore`**

`.nvmrc`:

```
22
```

`.prettierrc`:

```json
{
  "singleQuote": true,
  "semi": true,
  "trailingComma": "all",
  "printWidth": 100
}
```

`.prettierignore`:

```
node_modules
dist
coverage
pnpm-lock.yaml
iosapp
```

- [ ] **Step 5: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

- [ ] **Step 6: Create `eslint.config.mjs`**

```js
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/.vercel/**', 'iosapp/**'],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['webapp/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  prettier,
);
```

- [ ] **Step 7: Create `pnpm-workspace.yaml` and `package.json`**

`pnpm-workspace.yaml`:

```yaml
packages:
  - webapp
  - api
  - packages/*
```

`package.json`:

```json
{
  "name": "bbtapp",
  "private": true,
  "packageManager": "pnpm@10.33.0",
  "engines": {
    "node": ">=22"
  },
  "scripts": {
    "build": "pnpm -r build",
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r typecheck",
    "test": "pnpm -r test",
    "check": "pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm format:check",
    "dev": "pnpm -r --parallel --filter @bbt/api --filter @bbt/webapp dev",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

- [ ] **Step 8: Install root dev tooling**

```powershell
pnpm add -w -D typescript prettier eslint @eslint/js typescript-eslint eslint-config-prettier eslint-plugin-react-hooks vitest @types/node
```

Expected: `pnpm-lock.yaml` created, `devDependencies` added to root `package.json`, no errors.

- [ ] **Step 9: Verify the empty workspace is green**

```powershell
pnpm check
```

Expected: `pnpm -r lint|typecheck|test|build` each report no packages (exit 0), `prettier --check .` passes. If Prettier complains about a file you just wrote, run `pnpm format` and re-run.

- [ ] **Step 10: Commit**

```powershell
git add -A
git commit -m "Add pnpm workspace root with shared TypeScript, ESLint and Prettier config"
```

---

### Task 2: `packages/shared` contract package

**Files:**
- Create: `packages/shared/package.json`, `packages/shared/tsconfig.json`, `packages/shared/src/index.ts`, `packages/shared/src/health.ts`
- Test: `packages/shared/test/health.test.ts`

**Interfaces:**
- Produces: `HealthResponseSchema` (Zod object: `status: 'ok'`, `service: 'bbt-api'`, `timestamp: ISO 8601 string`) and `type HealthResponse = z.infer<typeof HealthResponseSchema>`, both exported from `@bbt/shared`.

- [ ] **Step 1: Create `packages/shared/package.json`**

```json
{
  "name": "@bbt/shared",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  }
}
```

- [ ] **Step 2: Create `packages/shared/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022"],
    "noEmit": true
  },
  "include": ["src", "test"]
}
```

- [ ] **Step 3: Add zod**

```powershell
pnpm --filter @bbt/shared add zod
```

- [ ] **Step 4: Write the failing test `packages/shared/test/health.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { HealthResponseSchema } from '../src/index';

const valid = {
  status: 'ok',
  service: 'bbt-api',
  timestamp: '2026-09-23T10:00:00.000Z',
};

describe('HealthResponseSchema', () => {
  it('accepts a valid health response', () => {
    expect(HealthResponseSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects an unknown status', () => {
    expect(HealthResponseSchema.safeParse({ ...valid, status: 'down' }).success).toBe(false);
  });

  it('rejects a non ISO timestamp', () => {
    expect(HealthResponseSchema.safeParse({ ...valid, timestamp: 'yesterday' }).success).toBe(false);
  });

  it('rejects a missing service', () => {
    const withoutService = { status: valid.status, timestamp: valid.timestamp };
    expect(HealthResponseSchema.safeParse(withoutService).success).toBe(false);
  });
});
```

- [ ] **Step 5: Run the test to verify it fails**

```powershell
pnpm --filter @bbt/shared test
```

Expected: FAIL, cannot find module `../src/index`.

- [ ] **Step 6: Implement `packages/shared/src/health.ts` and `packages/shared/src/index.ts`**

`src/health.ts`:

```ts
import { z } from 'zod';

export const HealthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.literal('bbt-api'),
  timestamp: z.iso.datetime(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
```

`src/index.ts`:

```ts
export { HealthResponseSchema } from './health';
export type { HealthResponse } from './health';
```

- [ ] **Step 7: Run the tests, typecheck and lint**

```powershell
pnpm --filter @bbt/shared test
pnpm --filter @bbt/shared typecheck
pnpm --filter @bbt/shared lint
```

Expected: 4 tests pass, typecheck and lint clean.

- [ ] **Step 8: Commit**

```powershell
git add -A
git commit -m "Add @bbt/shared contract package with health response schema"
```

---

### Task 3: `api` Hono backend

**Files:**
- Create: `api/package.json`, `api/tsconfig.json`, `api/vercel.json`, `api/.env.example`, `api/api/index.ts`, `api/src/app.ts`, `api/src/env.ts`, `api/src/server.ts`, `api/src/routes/health.ts`
- Test: `api/test/env.test.ts`, `api/test/app.test.ts`

**Interfaces:**
- Consumes: `HealthResponseSchema`, `HealthResponse` from `@bbt/shared`.
- Produces: `loadEnv(source?: NodeJS.ProcessEnv): Env`, `parseAllowedOrigins(value: string): string[]`, `createApp(env: Env): Hono`, `GET /health` returning a `HealthResponse`, JSON 404 `{ error: 'Not found' }`, JSON 500 `{ error: 'Internal server error' }`.

- [ ] **Step 1: Create `api/package.json`**

```json
{
  "name": "@bbt/api",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  }
}
```

Note: there is deliberately no `build` script. Vercel compiles the function in `api/index.ts` itself, and a `build` script with no output directory makes Vercel fail the deploy.

- [ ] **Step 2: Create `api/tsconfig.json`**

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022"],
    "types": ["node"],
    "noEmit": true
  },
  "include": ["api", "src", "test"]
}
```

- [ ] **Step 3: Add dependencies**

```powershell
pnpm --filter @bbt/api add hono zod "@bbt/shared@workspace:*"
pnpm --filter @bbt/api add -D @hono/node-server tsx
```

- [ ] **Step 4: Create `api/vercel.json` and `api/.env.example`**

`vercel.json`:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [{ "source": "/(.*)", "destination": "/api/index" }]
}
```

`.env.example`:

```
# Comma separated list of origins allowed by CORS.
ALLOWED_ORIGINS=http://localhost:5173
# Local dev server port. Ignored on Vercel.
PORT=3000
```

- [ ] **Step 5: Write the failing env test `api/test/env.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { loadEnv, parseAllowedOrigins } from '../src/env';

describe('parseAllowedOrigins', () => {
  it('splits on commas and trims whitespace', () => {
    expect(parseAllowedOrigins('http://a.test, https://b.test ,http://c.test')).toEqual([
      'http://a.test',
      'https://b.test',
      'http://c.test',
    ]);
  });

  it('drops empty entries', () => {
    expect(parseAllowedOrigins('http://a.test,,')).toEqual(['http://a.test']);
  });
});

describe('loadEnv', () => {
  it('applies development defaults when variables are absent', () => {
    expect(loadEnv({})).toEqual({ ALLOWED_ORIGINS: 'http://localhost:5173', PORT: 3000 });
  });

  it('coerces PORT to a number', () => {
    expect(loadEnv({ PORT: '4000' }).PORT).toBe(4000);
  });

  it('rejects a non numeric PORT', () => {
    expect(() => loadEnv({ PORT: 'abc' })).toThrow();
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

```powershell
pnpm --filter @bbt/api test
```

Expected: FAIL, cannot find module `../src/env`.

- [ ] **Step 7: Implement `api/src/env.ts`**

```ts
import { z } from 'zod';

const EnvSchema = z.object({
  ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),
  PORT: z.coerce.number().int().positive().default(3000),
});

export type Env = z.infer<typeof EnvSchema>;

/** Parses and validates environment variables. The only place that reads process.env. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  return EnvSchema.parse(source);
}

/** Turns the comma separated ALLOWED_ORIGINS value into a clean list. */
export function parseAllowedOrigins(value: string): string[] {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}
```

- [ ] **Step 8: Run the env tests to verify they pass**

```powershell
pnpm --filter @bbt/api test
```

Expected: 5 tests pass.

- [ ] **Step 9: Write the failing app test `api/test/app.test.ts`**

```ts
import { HealthResponseSchema } from '@bbt/shared';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

const app = createApp({ ALLOWED_ORIGINS: 'http://localhost:5173', PORT: 3000 });

describe('GET /health', () => {
  it('returns a response that satisfies the shared contract', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const parsed = HealthResponseSchema.safeParse(await res.json());
    expect(parsed.success).toBe(true);
  });

  it('allows a configured origin', async () => {
    const res = await app.request('/health', { headers: { Origin: 'http://localhost:5173' } });
    expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:5173');
  });

  it('does not allow an unknown origin', async () => {
    const res = await app.request('/health', { headers: { Origin: 'https://evil.example' } });
    expect(res.headers.get('access-control-allow-origin')).toBeNull();
  });
});

describe('unknown routes', () => {
  it('returns JSON 404', async () => {
    const res = await app.request('/nope');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Not found' });
  });
});
```

- [ ] **Step 10: Run the test to verify it fails**

```powershell
pnpm --filter @bbt/api test
```

Expected: FAIL, cannot find module `../src/app`.

- [ ] **Step 11: Implement `api/src/routes/health.ts` and `api/src/app.ts`**

`src/routes/health.ts`:

```ts
import { HealthResponseSchema, type HealthResponse } from '@bbt/shared';
import { Hono } from 'hono';

export const healthRoutes = new Hono().get('/', (c) => {
  const body: HealthResponse = {
    status: 'ok',
    service: 'bbt-api',
    timestamp: new Date().toISOString(),
  };
  // Parsing on the way out guarantees the response matches the shared contract.
  return c.json(HealthResponseSchema.parse(body));
});
```

`src/app.ts`:

```ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { parseAllowedOrigins, type Env } from './env';
import { healthRoutes } from './routes/health';

/** Builds the Hono application. Pure with respect to env so tests can construct it directly. */
export function createApp(env: Env): Hono {
  const app = new Hono();

  app.use('*', cors({ origin: parseAllowedOrigins(env.ALLOWED_ORIGINS) }));

  app.route('/health', healthRoutes);

  app.notFound((c) => c.json({ error: 'Not found' }, 404));
  app.onError((error, c) => {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  });

  return app;
}
```

- [ ] **Step 12: Run the tests to verify they pass**

```powershell
pnpm --filter @bbt/api test
```

Expected: 9 tests pass.

- [ ] **Step 13: Create the adapters `api/src/server.ts` and `api/api/index.ts`**

`src/server.ts`:

```ts
import { serve } from '@hono/node-server';
import { createApp } from './app';
import { loadEnv } from './env';

const env = loadEnv();
const app = createApp(env);

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`bbt-api listening on http://localhost:${info.port}`);
});
```

`api/index.ts` (Vercel entrypoint; the folder is named `api` because Vercel looks for functions there):

```ts
import { handle } from 'hono/vercel';
import { createApp } from '../src/app';
import { loadEnv } from '../src/env';

export default handle(createApp(loadEnv()));
```

- [ ] **Step 14: Lint, typecheck, and smoke the dev server**

```powershell
pnpm --filter @bbt/api lint
pnpm --filter @bbt/api typecheck
```

Expected: clean.

Start the server in the background, hit it, and stop it:

```powershell
$proc = Start-Process -FilePath pnpm -ArgumentList '--filter','@bbt/api','dev' -PassThru -NoNewWindow
Start-Sleep -Seconds 4
Invoke-RestMethod http://localhost:3000/health
Invoke-WebRequest http://localhost:3000/health -Headers @{ Origin = 'http://localhost:5173' } | Select-Object -ExpandProperty Headers
Stop-Process -Id $proc.Id -Force
```

Expected: JSON with `status: ok`, `service: bbt-api`, an ISO timestamp; headers include `Access-Control-Allow-Origin: http://localhost:5173`. If a stray `node` process keeps port 3000 busy afterwards, stop it with `Get-Process node | Stop-Process -Force`.

- [ ] **Step 15: Commit**

```powershell
git add -A
git commit -m "Add @bbt/api Hono backend with health route, CORS and Vercel entrypoint"
```

---

### Task 4: `webapp` React frontend

**Files:**
- Create: `webapp/package.json`, `webapp/tsconfig.json`, `webapp/vite.config.ts`, `webapp/vercel.json`, `webapp/.env.example`, `webapp/index.html`, `webapp/src/main.tsx`, `webapp/src/App.tsx`, `webapp/src/config.ts`, `webapp/src/platform.ts`, `webapp/src/styles.css`, `webapp/src/vite-env.d.ts`, `webapp/src/api/client.ts`, `webapp/src/components/ApiStatus.tsx`, `webapp/src/test/setup.ts`
- Test: `webapp/src/platform.test.ts`, `webapp/src/api/client.test.ts`, `webapp/src/components/ApiStatus.test.tsx`, `webapp/src/App.test.tsx`

**Interfaces:**
- Consumes: `HealthResponseSchema`, `HealthResponse` from `@bbt/shared`.
- Produces: `IOS_SHELL_USER_AGENT_TOKEN = 'BBTiOS/'`, `isInIosShell(userAgent?: string): boolean`, `API_URL: string`, `fetchHealth(fetchImpl?: typeof fetch): Promise<HealthResponse>`, `<ApiStatus />`, `<App />`.

- [ ] **Step 1: Create `webapp/package.json`**

```json
{
  "name": "@bbt/webapp",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  }
}
```

- [ ] **Step 2: Create `webapp/tsconfig.json`**

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "types": ["vite/client"],
    "noEmit": true
  },
  "include": ["src", "vite.config.ts"]
}
```

- [ ] **Step 3: Add dependencies**

```powershell
pnpm --filter @bbt/webapp add react react-dom "@bbt/shared@workspace:*"
pnpm --filter @bbt/webapp add -D vite @vitejs/plugin-react @types/react @types/react-dom jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom
```

- [ ] **Step 4: Create `webapp/vite.config.ts`, `webapp/vercel.json`, `webapp/.env.example`**

`vite.config.ts`:

```ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

`vercel.json`:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

`.env.example`:

```
# Base URL of the api project. No trailing slash.
VITE_API_URL=http://localhost:3000
```

- [ ] **Step 5: Create `webapp/index.html`, `webapp/src/vite-env.d.ts`, `webapp/src/test/setup.ts`, `webapp/src/styles.css`**

`index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, viewport-fit=cover"
    />
    <meta name="color-scheme" content="light dark" />
    <title>BBT</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/vite-env.d.ts`:

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

`src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

`src/styles.css`:

```css
:root {
  color-scheme: light dark;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  -webkit-text-size-adjust: 100%;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body,
#root {
  margin: 0;
  min-height: 100dvh;
}

body {
  /* The iOS shell renders edge to edge; these insets keep content clear of the notch and home indicator. */
  padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom)
    env(safe-area-inset-left);
}

.app {
  padding: 1.5rem 1rem;
  max-width: 40rem;
  margin: 0 auto;
}

.shell-note {
  font-size: 0.875rem;
  opacity: 0.7;
}
```

- [ ] **Step 6: Write the failing test `webapp/src/platform.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { isInIosShell } from './platform';

const safariUa =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

describe('isInIosShell', () => {
  it('is true when the BBTiOS token is present', () => {
    expect(isInIosShell(`${safariUa} BBTiOS/1.0.0`)).toBe(true);
  });

  it('is false for plain Safari', () => {
    expect(isInIosShell(safariUa)).toBe(false);
  });

  it('defaults to the browser user agent', () => {
    expect(isInIosShell()).toBe(false);
  });
});
```

- [ ] **Step 7: Run the test to verify it fails**

```powershell
pnpm --filter @bbt/webapp test
```

Expected: FAIL, cannot find module `./platform`.

- [ ] **Step 8: Implement `webapp/src/platform.ts` and `webapp/src/config.ts`**

`src/platform.ts`:

```ts
/** Product token the iOS shell appends to its WKWebView user agent, for example "BBTiOS/1.0.0". */
export const IOS_SHELL_USER_AGENT_TOKEN = 'BBTiOS/';

/** True when the page is running inside the BBT iOS app. The site must work identically either way. */
export function isInIosShell(userAgent: string = navigator.userAgent): boolean {
  return userAgent.includes(IOS_SHELL_USER_AGENT_TOKEN);
}
```

`src/config.ts`:

```ts
/** Base URL of the api project. The only place that reads import.meta.env. */
export const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
```

- [ ] **Step 9: Run the platform tests to verify they pass**

```powershell
pnpm --filter @bbt/webapp test
```

Expected: 3 tests pass.

- [ ] **Step 10: Write the failing test `webapp/src/api/client.test.ts`**

```ts
import { describe, expect, it, vi } from 'vitest';
import { fetchHealth } from './client';

function fakeFetch(status: number, body: unknown): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as unknown as typeof fetch;
}

describe('fetchHealth', () => {
  it('returns the parsed health response', async () => {
    const body = { status: 'ok', service: 'bbt-api', timestamp: '2026-09-23T10:00:00.000Z' };
    await expect(fetchHealth(fakeFetch(200, body))).resolves.toEqual(body);
  });

  it('calls the /health endpoint on the configured API URL', async () => {
    const impl = fakeFetch(200, {
      status: 'ok',
      service: 'bbt-api',
      timestamp: '2026-09-23T10:00:00.000Z',
    });
    await fetchHealth(impl);
    expect(impl).toHaveBeenCalledWith('http://localhost:3000/health');
  });

  it('throws on a non 2xx status', async () => {
    await expect(fetchHealth(fakeFetch(503, {}))).rejects.toThrow('503');
  });

  it('throws when the body does not match the contract', async () => {
    await expect(fetchHealth(fakeFetch(200, { status: 'down' }))).rejects.toThrow();
  });
});
```

- [ ] **Step 11: Run the test to verify it fails**

```powershell
pnpm --filter @bbt/webapp test
```

Expected: FAIL, cannot find module `./client`.

- [ ] **Step 12: Implement `webapp/src/api/client.ts`**

```ts
import { HealthResponseSchema, type HealthResponse } from '@bbt/shared';
import { API_URL } from '../config';

/** Fetches the API health status. The only place that calls fetch against the API. */
export async function fetchHealth(fetchImpl: typeof fetch = fetch): Promise<HealthResponse> {
  const response = await fetchImpl(`${API_URL}/health`);
  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`);
  }
  return HealthResponseSchema.parse(await response.json());
}
```

- [ ] **Step 13: Run the client tests to verify they pass**

```powershell
pnpm --filter @bbt/webapp test
```

Expected: 7 tests pass.

- [ ] **Step 14: Write the failing test `webapp/src/components/ApiStatus.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchHealth } from '../api/client';
import { ApiStatus } from './ApiStatus';

vi.mock('../api/client', () => ({ fetchHealth: vi.fn() }));

const mockedFetchHealth = vi.mocked(fetchHealth);

describe('ApiStatus', () => {
  beforeEach(() => {
    mockedFetchHealth.mockReset();
  });

  it('shows a checking state first', () => {
    mockedFetchHealth.mockReturnValue(new Promise<never>(() => {}));
    render(<ApiStatus />);
    expect(screen.getByRole('status')).toHaveTextContent('API: checking');
  });

  it('shows ok with the timestamp when the API responds', async () => {
    mockedFetchHealth.mockResolvedValue({
      status: 'ok',
      service: 'bbt-api',
      timestamp: '2026-09-23T10:00:00.000Z',
    });
    render(<ApiStatus />);
    expect(await screen.findByText(/API: ok/)).toHaveTextContent('2026-09-23T10:00:00.000Z');
  });

  it('shows an alert when the API is unreachable', async () => {
    mockedFetchHealth.mockRejectedValue(new Error('boom'));
    render(<ApiStatus />);
    expect(await screen.findByRole('alert')).toHaveTextContent('API: unreachable (boom)');
  });
});
```

- [ ] **Step 15: Run the test to verify it fails**

```powershell
pnpm --filter @bbt/webapp test
```

Expected: FAIL, cannot find module `./ApiStatus`.

- [ ] **Step 16: Implement `webapp/src/components/ApiStatus.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { fetchHealth } from '../api/client';

type Status =
  | { kind: 'loading' }
  | { kind: 'ok'; timestamp: string }
  | { kind: 'error'; message: string };

export function ApiStatus() {
  const [status, setStatus] = useState<Status>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    fetchHealth()
      .then((health) => {
        if (!cancelled) setStatus({ kind: 'ok', timestamp: health.timestamp });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setStatus({
            kind: 'error',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  switch (status.kind) {
    case 'loading':
      return <p role="status">API: checking...</p>;
    case 'ok':
      return <p role="status">API: ok (as of {status.timestamp})</p>;
    case 'error':
      return <p role="alert">API: unreachable ({status.message})</p>;
  }
}
```

- [ ] **Step 17: Run the tests to verify they pass**

```powershell
pnpm --filter @bbt/webapp test
```

Expected: 10 tests pass.

- [ ] **Step 18: Write the failing test `webapp/src/App.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';

vi.mock('./api/client', () => ({
  fetchHealth: vi.fn().mockResolvedValue({
    status: 'ok',
    service: 'bbt-api',
    timestamp: '2026-09-23T10:00:00.000Z',
  }),
}));

describe('App', () => {
  it('renders the heading and the API status', async () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'BBT' })).toBeInTheDocument();
    expect(await screen.findByText(/API: ok/)).toBeInTheDocument();
  });

  it('does not show the iOS shell note in a browser', () => {
    render(<App />);
    expect(screen.queryByText(/inside the BBT iOS app/)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 19: Run the test to verify it fails**

```powershell
pnpm --filter @bbt/webapp test
```

Expected: FAIL, cannot find module `./App`.

- [ ] **Step 20: Implement `webapp/src/App.tsx` and `webapp/src/main.tsx`**

`src/App.tsx`:

```tsx
import { ApiStatus } from './components/ApiStatus';
import { isInIosShell } from './platform';

export function App() {
  return (
    <main className="app">
      <h1>BBT</h1>
      <p>The BBT web app.</p>
      {isInIosShell() && <p className="shell-note">Running inside the BBT iOS app.</p>}
      <ApiStatus />
    </main>
  );
}
```

`src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 21: Run tests, lint, typecheck and build**

```powershell
pnpm --filter @bbt/webapp test
pnpm --filter @bbt/webapp lint
pnpm --filter @bbt/webapp typecheck
pnpm --filter @bbt/webapp build
```

Expected: 12 tests pass, lint and typecheck clean, `webapp/dist/index.html` exists.

- [ ] **Step 22: Commit**

```powershell
git add -A
git commit -m "Add @bbt/webapp React app with API health status and iOS shell detection"
```

---

### Task 5: End to end verification of the JS workspace

**Files:**
- None created. This task proves the three packages work together.

- [ ] **Step 1: Run the full root check**

```powershell
pnpm check
```

Expected: every package lints, typechecks and tests green; `webapp` builds; Prettier passes. Fix anything red before continuing (run `pnpm format` for formatting).

- [ ] **Step 2: Start api and webapp together**

```powershell
$dev = Start-Process -FilePath pnpm -ArgumentList 'dev' -PassThru -NoNewWindow
Start-Sleep -Seconds 6
```

- [ ] **Step 3: Verify the API and the served page**

```powershell
Invoke-RestMethod http://localhost:3000/health
(Invoke-WebRequest http://localhost:5173/).Content | Select-String -Pattern 'viewport-fit=cover','<div id="root">'
```

Expected: health JSON; both patterns matched in the HTML.

- [ ] **Step 4: Verify the browser to API round trip**

Open `http://localhost:5173/` in a browser (or use a browser automation tool if available).
Expected: heading `BBT`, text `The BBT web app.`, and within a second `API: ok (as of <timestamp>)`.
No `Running inside the BBT iOS app.` line.
Check the browser console: no CORS errors.

If a browser is unavailable, note in the report that the round trip was verified only by the unit tests plus the two curl-style checks above.

- [ ] **Step 5: Stop the dev processes**

```powershell
Stop-Process -Id $dev.Id -Force
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
```

- [ ] **Step 6: Commit any formatting fixes**

```powershell
git status --short
```

If anything changed, `git add -A; git commit -m "Apply formatting fixes from workspace check"`. Otherwise nothing to commit.

---

### Task 6: `iosapp` SwiftUI shell (XcodeGen)

**Files:**
- Create: `iosapp/project.yml`, `iosapp/Config/Debug.xcconfig`, `iosapp/Config/Release.xcconfig`, `iosapp/BBT/Info.plist`, `iosapp/BBT/BBTApp.swift`, `iosapp/BBT/AppConfig.swift`, `iosapp/BBT/WebViewModel.swift`, `iosapp/BBT/WebView.swift`, `iosapp/BBT/StatusViews.swift`, `iosapp/BBT/ContentView.swift`, `iosapp/BBT/Assets.xcassets/Contents.json`, `iosapp/BBT/Assets.xcassets/AppIcon.appiconset/Contents.json`, `iosapp/BBT/Assets.xcassets/AccentColor.colorset/Contents.json`
- Test: `iosapp/BBTTests/AppConfigTests.swift`

**Interfaces:**
- Produces: `AppConfig(rawURL:appVersion:) throws`, `AppConfig.load(from:) throws`, `AppConfig.webAppURL: URL`, `AppConfig.userAgentSuffix: String` (`BBTiOS/<version>`), `WebViewModel` with `state: .loading | .loaded | .failed(message:)`, `WebView` (`UIViewRepresentable`), `ContentView(config:)`.
- Cannot be compiled on Windows. Verification is by inspection plus parsing YAML, plist XML and JSON.

- [ ] **Step 1: Create `iosapp/project.yml`**

```yaml
name: BBT
options:
  bundleIdPrefix: com.tristanjong
  deploymentTarget:
    iOS: "17.0"
  createIntermediateGroups: true
  generateEmptyDirectories: true

configs:
  Debug: debug
  Release: release

configFiles:
  Debug: Config/Debug.xcconfig
  Release: Config/Release.xcconfig

settings:
  base:
    SWIFT_VERSION: "5.10"
    MARKETING_VERSION: "1.0.0"
    CURRENT_PROJECT_VERSION: "1"
    CODE_SIGN_STYLE: Automatic
    SWIFT_STRICT_CONCURRENCY: complete

targets:
  BBT:
    type: application
    platform: iOS
    sources:
      - path: BBT
    settings:
      base:
        PRODUCT_BUNDLE_IDENTIFIER: com.tristanjong.bbtapp
        PRODUCT_NAME: BBT
        INFOPLIST_FILE: BBT/Info.plist
        GENERATE_INFOPLIST_FILE: NO
        ASSETCATALOG_COMPILER_APPICON_NAME: AppIcon
        ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME: AccentColor
        TARGETED_DEVICE_FAMILY: "1"
        SUPPORTED_INTERFACE_ORIENTATIONS: UIInterfaceOrientationPortrait
        SUPPORTED_INTERFACE_ORIENTATIONS_IPAD: UIInterfaceOrientationPortrait

  BBTTests:
    type: bundle.unit-test
    platform: iOS
    sources:
      - path: BBTTests
    dependencies:
      - target: BBT
    settings:
      base:
        PRODUCT_BUNDLE_IDENTIFIER: com.tristanjong.bbtapp.tests
        GENERATE_INFOPLIST_FILE: YES

schemes:
  BBT:
    build:
      targets:
        BBT: all
        BBTTests: [test]
    run:
      config: Debug
    test:
      config: Debug
      targets:
        - BBTTests
    archive:
      config: Release
```

- [ ] **Step 2: Create the xcconfig files**

`Config/Debug.xcconfig`:

```
// Debug points at the local Vite dev server.
// "//" starts a comment in xcconfig, so URLs are written as scheme:/$()/host.
WEBAPP_URL = http:/$()/localhost:5173
```

`Config/Release.xcconfig`:

```
// Release points at the deployed webapp on Vercel.
// Replace the host once the Vercel project exists. Keep the /$()/ trick, "//" is a comment.
WEBAPP_URL = https:/$()/REPLACE_WITH_PRODUCTION_HOST
```

- [ ] **Step 3: Create `iosapp/BBT/Info.plist`**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleDevelopmentRegion</key>
	<string>$(DEVELOPMENT_LANGUAGE)</string>
	<key>CFBundleDisplayName</key>
	<string>BBT</string>
	<key>CFBundleExecutable</key>
	<string>$(EXECUTABLE_NAME)</string>
	<key>CFBundleIdentifier</key>
	<string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
	<key>CFBundleInfoDictionaryVersion</key>
	<string>6.0</string>
	<key>CFBundleName</key>
	<string>$(PRODUCT_NAME)</string>
	<key>CFBundlePackageType</key>
	<string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
	<key>CFBundleShortVersionString</key>
	<string>$(MARKETING_VERSION)</string>
	<key>CFBundleVersion</key>
	<string>$(CURRENT_PROJECT_VERSION)</string>
	<key>LSRequiresIPhoneOS</key>
	<true/>
	<key>UILaunchScreen</key>
	<dict/>
	<key>UIRequiredDeviceCapabilities</key>
	<array>
		<string>arm64</string>
	</array>
	<key>UISupportedInterfaceOrientations</key>
	<array>
		<string>UIInterfaceOrientationPortrait</string>
	</array>
	<key>WEBAPP_URL</key>
	<string>$(WEBAPP_URL)</string>
	<key>NSAppTransportSecurity</key>
	<dict>
		<key>NSAllowsLocalNetworking</key>
		<true/>
	</dict>
</dict>
</plist>
```

- [ ] **Step 4: Create the asset catalog JSON files**

`BBT/Assets.xcassets/Contents.json`:

```json
{
  "info": {
    "author": "xcode",
    "version": 1
  }
}
```

`BBT/Assets.xcassets/AppIcon.appiconset/Contents.json`:

```json
{
  "images": [
    {
      "idiom": "universal",
      "platform": "ios",
      "size": "1024x1024"
    }
  ],
  "info": {
    "author": "xcode",
    "version": 1
  }
}
```

`BBT/Assets.xcassets/AccentColor.colorset/Contents.json`:

```json
{
  "colors": [
    {
      "idiom": "universal"
    }
  ],
  "info": {
    "author": "xcode",
    "version": 1
  }
}
```

- [ ] **Step 5: Write the test `iosapp/BBTTests/AppConfigTests.swift`**

```swift
import XCTest
@testable import BBT

final class AppConfigTests: XCTestCase {
    func testParsesHTTPSURL() throws {
        let config = try AppConfig(rawURL: "https://bbt.example.com", appVersion: "1.2.3")
        XCTAssertEqual(config.webAppURL.absoluteString, "https://bbt.example.com")
    }

    func testParsesLocalHTTPURLWithPort() throws {
        let config = try AppConfig(rawURL: "http://localhost:5173", appVersion: "1.0.0")
        XCTAssertEqual(config.webAppURL.host, "localhost")
        XCTAssertEqual(config.webAppURL.port, 5173)
    }

    func testTrimsWhitespace() throws {
        let config = try AppConfig(rawURL: "  https://bbt.example.com\n", appVersion: "1.0.0")
        XCTAssertEqual(config.webAppURL.absoluteString, "https://bbt.example.com")
    }

    func testRejectsEmptyURL() {
        XCTAssertThrowsError(try AppConfig(rawURL: "", appVersion: "1.0.0")) { error in
            guard case AppConfigError.invalidWebAppURL = error else {
                return XCTFail("Expected invalidWebAppURL, got \(error)")
            }
        }
    }

    func testRejectsCommentMangledURL() {
        // What you get if an xcconfig writes https://host without the /$()/ trick.
        XCTAssertThrowsError(try AppConfig(rawURL: "https:", appVersion: "1.0.0"))
    }

    func testRejectsNonHTTPScheme() {
        XCTAssertThrowsError(try AppConfig(rawURL: "ftp://bbt.example.com", appVersion: "1.0.0"))
    }

    func testUserAgentSuffixUsesProductTokenAndVersion() throws {
        let config = try AppConfig(rawURL: "https://bbt.example.com", appVersion: "1.2.3")
        XCTAssertEqual(config.userAgentSuffix, "BBTiOS/1.2.3")
    }
}
```

- [ ] **Step 6: Implement `iosapp/BBT/AppConfig.swift`**

```swift
import Foundation

/// Runtime configuration for the shell. The only place that reads Info.plist.
struct AppConfig: Equatable {
    /// Product token the shell appends to the WKWebView user agent. The webapp checks for it.
    static let userAgentProduct = "BBTiOS"

    let webAppURL: URL
    let appVersion: String

    /// For example "BBTiOS/1.0.0". Appended to the default WebKit user agent.
    var userAgentSuffix: String {
        "\(Self.userAgentProduct)/\(appVersion)"
    }

    init(rawURL: String, appVersion: String) throws {
        let trimmed = rawURL.trimmingCharacters(in: .whitespacesAndNewlines)
        guard
            let url = URL(string: trimmed),
            let scheme = url.scheme?.lowercased(),
            ["http", "https"].contains(scheme),
            url.host != nil
        else {
            throw AppConfigError.invalidWebAppURL(trimmed)
        }
        self.webAppURL = url
        self.appVersion = appVersion
    }

    /// Reads WEBAPP_URL and CFBundleShortVersionString from the bundle's Info.plist.
    static func load(from bundle: Bundle = .main) throws -> AppConfig {
        guard let rawURL = bundle.object(forInfoDictionaryKey: "WEBAPP_URL") as? String else {
            throw AppConfigError.missingWebAppURL
        }
        let version = bundle.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "0"
        return try AppConfig(rawURL: rawURL, appVersion: version)
    }
}

enum AppConfigError: Error, LocalizedError, Equatable {
    case missingWebAppURL
    case invalidWebAppURL(String)

    var errorDescription: String? {
        switch self {
        case .missingWebAppURL:
            return "WEBAPP_URL is missing from Info.plist. Check Config/*.xcconfig."
        case .invalidWebAppURL(let value):
            return "WEBAPP_URL is not a valid http(s) URL: \"\(value)\". In xcconfig write https:/$()/host, because // starts a comment."
        }
    }
}
```

- [ ] **Step 7: Implement `iosapp/BBT/WebViewModel.swift`**

```swift
import Foundation
import Observation

/// Loading state of the web content. Owned by ContentView, driven by WebView's navigation delegate.
@Observable
@MainActor
final class WebViewModel {
    enum State: Equatable {
        case loading
        case loaded
        case failed(message: String)
    }

    private(set) var state: State = .loading

    func didStartLoading() {
        state = .loading
    }

    func didFinishLoading() {
        state = .loaded
    }

    func didFail(_ error: Error) {
        state = .failed(message: error.localizedDescription)
    }
}
```

- [ ] **Step 8: Implement `iosapp/BBT/WebView.swift`**

```swift
import SwiftUI
import WebKit

/// Wraps WKWebView for SwiftUI. Owns everything WebKit specific.
struct WebView: UIViewRepresentable {
    let url: URL
    let userAgentSuffix: String
    let model: WebViewModel
    /// Increment to force a reload (used by the retry button).
    let reloadToken: Int

    func makeCoordinator() -> Coordinator {
        Coordinator(model: model)
    }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.allowsInlineMediaPlayback = true

        // Preserve WebKit's default "Mobile/<build>" token and append ours.
        let defaultApplicationName = configuration.applicationNameForUserAgent ?? ""
        configuration.applicationNameForUserAgent = [defaultApplicationName, userAgentSuffix]
            .filter { !$0.isEmpty }
            .joined(separator: " ")

        // Extension point for a JavaScript to Swift bridge:
        // configuration.userContentController.add(handler, name: "bbt")
        // and expose window.webkit.messageHandlers.bbt to the webapp.

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.isOpaque = false
        webView.backgroundColor = .systemBackground
        webView.load(URLRequest(url: url))
        context.coordinator.lastReloadToken = reloadToken
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        guard context.coordinator.lastReloadToken != reloadToken else { return }
        context.coordinator.lastReloadToken = reloadToken
        webView.load(URLRequest(url: url))
    }

    @MainActor
    final class Coordinator: NSObject, WKNavigationDelegate {
        let model: WebViewModel
        var lastReloadToken = 0

        init(model: WebViewModel) {
            self.model = model
        }

        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            model.didStartLoading()
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            model.didFinishLoading()
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            model.didFail(error)
        }

        func webView(
            _ webView: WKWebView,
            didFailProvisionalNavigation navigation: WKNavigation!,
            withError error: Error
        ) {
            model.didFail(error)
        }
    }
}
```

- [ ] **Step 9: Implement `iosapp/BBT/StatusViews.swift`**

```swift
import SwiftUI

/// Shown when the webapp cannot be reached. The shell has no bundled content, so this must exist.
struct OfflineView: View {
    let message: String
    let retry: () -> Void

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "wifi.exclamationmark")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)
            Text("Can't reach BBT")
                .font(.title2.weight(.semibold))
            Text(message)
                .font(.footnote)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
            Button("Try again", action: retry)
                .buttonStyle(.borderedProminent)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.systemBackground))
    }
}

/// Shown when Info.plist has no usable WEBAPP_URL. A misconfigured build should fail loudly.
struct ConfigurationErrorView: View {
    let error: Error

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 48))
                .foregroundStyle(.orange)
            Text("Configuration error")
                .font(.title2.weight(.semibold))
            Text(error.localizedDescription)
                .font(.footnote)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.systemBackground))
    }
}

#Preview("Offline") {
    OfflineView(message: "The Internet connection appears to be offline.") {}
}

#Preview("Configuration error") {
    ConfigurationErrorView(error: AppConfigError.missingWebAppURL)
}
```

- [ ] **Step 10: Implement `iosapp/BBT/ContentView.swift` and `iosapp/BBT/BBTApp.swift`**

`ContentView.swift`:

```swift
import SwiftUI

/// Hosts the web content edge to edge. The webapp handles safe areas with CSS env() insets.
struct ContentView: View {
    let config: AppConfig
    @State private var model = WebViewModel()
    @State private var reloadToken = 0

    var body: some View {
        ZStack {
            WebView(
                url: config.webAppURL,
                userAgentSuffix: config.userAgentSuffix,
                model: model,
                reloadToken: reloadToken
            )
            .ignoresSafeArea()

            switch model.state {
            case .loading:
                ProgressView()
                    .controlSize(.large)
            case .loaded:
                EmptyView()
            case .failed(let message):
                OfflineView(message: message) {
                    reloadToken += 1
                }
                .ignoresSafeArea()
            }
        }
    }
}
```

`BBTApp.swift`:

```swift
import SwiftUI

@main
struct BBTApp: App {
    private let configResult = Result { try AppConfig.load() }

    var body: some Scene {
        WindowGroup {
            switch configResult {
            case .success(let config):
                ContentView(config: config)
            case .failure(let error):
                ConfigurationErrorView(error: error)
            }
        }
    }
}
```

- [ ] **Step 11: Validate the non Swift files parse**

```powershell
pnpm dlx js-yaml iosapp/project.yml | Out-Null; if ($?) { "project.yml OK" }
[xml](Get-Content iosapp/BBT/Info.plist -Raw) | Out-Null; if ($?) { "Info.plist OK" }
Get-ChildItem -Recurse iosapp/BBT/Assets.xcassets -Filter *.json | ForEach-Object { Get-Content $_.FullName -Raw | ConvertFrom-Json | Out-Null; "$($_.Name) OK" }
```

Expected: three OK lines plus one per JSON file, no exceptions.

- [ ] **Step 12: Inspect the Swift for the things a compiler would catch**

Read each Swift file once and confirm:

- every `import` used exists (`Foundation`, `SwiftUI`, `WebKit`, `Observation`, `XCTest`);
- `WebViewModel()` has no required init parameters (it does not);
- `WebView` receives `model: model` (a reference type, no `Binding`) and `reloadToken: reloadToken` (a value);
- `AppConfigError` conforms to `Equatable` so the test's `guard case` compiles;
- no `//` comment inside an xcconfig value.

Record in the task report that this project was not compiled.

- [ ] **Step 13: Commit**

```powershell
git add -A
git commit -m "Add iosapp SwiftUI WKWebView shell described by XcodeGen"
```

---

### Task 7: Root agent infrastructure (CLAUDE.md, knowledge, ADRs, skills)

**Files:**
- Create: `CLAUDE.md`, `knowledge/INDEX.md`, `knowledge/architecture.md`, `knowledge/conventions.md`, `knowledge/glossary.md`, `knowledge/decisions/TEMPLATE.md`, `knowledge/decisions/0001-monorepo-with-pnpm-workspaces.md`, `knowledge/decisions/0002-ios-shell-loads-remote-webapp.md`, `knowledge/decisions/0003-xcodegen-for-ios-project.md`, `knowledge/decisions/0004-hono-on-vercel-for-api.md`, `knowledge/decisions/0005-shared-contract-package.md`, `.claude/skills/verify-all/SKILL.md`, `.claude/skills/record-decision/SKILL.md`, `.claude/skills/update-knowledge/SKILL.md`

**Interfaces:**
- Produces: the root entry points every agent reads first. Later tasks link to `knowledge/architecture.md` and `knowledge/conventions.md` by path.

- [ ] **Step 1: Create `CLAUDE.md`**

````markdown
# BBT App Monorepo

## Purpose

BBT is a product with a standalone website (`webapp`), its backend (`api`), and a native iOS shell (`iosapp`) that loads the deployed website in a WKWebView.
Each project builds and deploys independently.
`packages/shared` holds the typed contract between `webapp` and `api`.

## Repo map

| Path | What | Read first |
|---|---|---|
| `webapp/` | React + TypeScript site on Vercel | `webapp/CLAUDE.md` |
| `api/` | Hono + TypeScript backend on Vercel | `api/CLAUDE.md` |
| `packages/shared/` | Zod schemas and types shared by webapp and api | `packages/shared/CLAUDE.md` |
| `iosapp/` | SwiftUI WKWebView shell, XcodeGen project | `iosapp/CLAUDE.md` |
| `knowledge/` | Durable facts about the whole repo | `knowledge/INDEX.md` |
| `docs/superpowers/` | Design specs and implementation plans | latest spec |

## Who does the work

All development work on this repo is done through Tristan's agency at `C:\Users\trist\OneDrive\Desktop\tristans-agency`.
Read the agency's `CLAUDE.md` and `orchestration.md` first, then adopt the matching agent definition and its skills from `agents/<agent>/`.

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

Any change that touches the `webapp` to `api` boundary involves both `front-end-engineer` and `back-end-engineer` through the agency's `coordinate-api-contract` skill.
Known gap: the agency has no dedicated iOS agent.
Say so in your report when doing iOS work rather than silently improvising.

## Commands (run from the repo root)

- `pnpm install` - install everything.
- `pnpm dev` - run `api` (port 3000) and `webapp` (port 5173) together.
- `pnpm check` - lint, typecheck, test, build and format check across the workspace. Must be green before work is declared done.
- `pnpm format` - fix formatting.
- iOS: see `iosapp/CLAUDE.md`. It cannot be built on Windows.

## Rules

- Read `knowledge/INDEX.md` before changing anything you do not already understand.
- If you changed how something works, update the relevant `knowledge/` document in the same change. Use the `update-knowledge` skill.
- API shape changes start in `packages/shared`, then `api`, then `webapp`.
- Record non-obvious decisions as ADRs with the `record-decision` skill.
- Never commit `*.xcodeproj`, `.vercel/`, `.env` files, `node_modules` or `dist`.
- Report verification faithfully: if a check failed or could not be run (iOS on Windows), say so.
- Follow Tristan's global instructions: no em dashes, one sentence per line in long Markdown, no agent co-author lines in commits.

## Where to look

- How the pieces connect: `knowledge/architecture.md`.
- Conventions: `knowledge/conventions.md`.
- Why things are the way they are: `knowledge/decisions/`.
- Repo-level skills: `.claude/skills/` (`verify-all`, `record-decision`, `update-knowledge`).
````

- [ ] **Step 2: Create `knowledge/INDEX.md`, `knowledge/glossary.md`, `knowledge/conventions.md`**

`knowledge/INDEX.md`:

```markdown
# Knowledge Index

One line per document.
Read the document, not this index, for the facts.

- [Architecture](architecture.md) - how webapp, api, shared and iosapp connect, including URL config, user agent contract and CORS.
- [Conventions](conventions.md) - commits, formatting, testing expectations and Markdown rules.
- [Glossary](glossary.md) - terms used across the repo.
- [Decisions](decisions/) - numbered ADRs. Start with `0001`.
  - [0001 Monorepo with pnpm workspaces](decisions/0001-monorepo-with-pnpm-workspaces.md)
  - [0002 iOS shell loads the remote webapp](decisions/0002-ios-shell-loads-remote-webapp.md)
  - [0003 XcodeGen for the iOS project](decisions/0003-xcodegen-for-ios-project.md)
  - [0004 Hono on Vercel for the api](decisions/0004-hono-on-vercel-for-api.md)
  - [0005 Shared contract package](decisions/0005-shared-contract-package.md)

Project knowledge bases: `webapp/knowledge/INDEX.md`, `api/knowledge/INDEX.md`, `iosapp/knowledge/INDEX.md`.
```

`knowledge/glossary.md`:

```markdown
# Glossary

- **Shell**: the native `iosapp`. It contains no product UI of its own; it hosts the webapp in a WKWebView.
- **Webapp**: the React site in `webapp/`. Usable in any browser and inside the shell.
- **Contract**: the Zod schemas in `packages/shared` that define what `api` returns and what `webapp` expects.
- **User agent token**: the `BBTiOS/<version>` suffix the shell appends to the WKWebView user agent so the webapp can detect it.
- **WEBAPP_URL**: the build setting in `iosapp/Config/*.xcconfig` that tells the shell which site to load.
- **ADR**: Architecture Decision Record, stored in `knowledge/decisions/`.
- **Knowledge base**: a `knowledge/` folder with an `INDEX.md`. Exists at the root and in each project.
```

`knowledge/conventions.md`:

```markdown
# Conventions

## Git

- Branch from `main`. Commit small and often with plain imperative messages, for example `Add health route to api`.
- No agent co-author lines in commit messages.
- Never commit generated or secret files: `*.xcodeproj`, `.vercel/`, `.env`, `node_modules`, `dist`.
- Line endings are LF, enforced by `.gitattributes`.

## Formatting and linting

- Prettier formats every JS, TS, JSON, CSS, YAML and Markdown file outside `iosapp/`. Run `pnpm format`.
- ESLint uses the single root `eslint.config.mjs`. Do not add per-package ESLint configs.
- TypeScript is strict. Every package extends `tsconfig.base.json` and overrides only `lib`, `types`, `jsx` and `include`.
- Swift uses 4 space indentation and Swift 5.10 with strict concurrency.

## Testing

- Test first. Write the failing test, watch it fail, make it pass, then refactor.
- Every package keeps at least one meaningful test so `pnpm check` stays meaningful.
- `webapp` tests use Vitest with jsdom and React Testing Library. Query by role and text, not by class.
- `api` tests call `app.request()` in process. They never open a port.
- `iosapp` tests are XCTest and can only run on a Mac.

## Markdown

- No em dashes. Use `-`.
- One sentence per line in any document longer than a few lines.
- Every `knowledge/` folder has an `INDEX.md` with one line per document and no content of its own.
- `CLAUDE.md` files stay under about 60 lines. Anything longer belongs in `knowledge/` with a pointer.

## Environment

- Node 22 via `.nvmrc` to match Vercel. Newer local Node versions are fine.
- pnpm is the only package manager. Do not create `package-lock.json` or `yarn.lock`.
- `webapp` dev server is port 5173, `api` dev server is port 3000. Do not change these without updating `iosapp/Config/Debug.xcconfig` and `api/.env.example`.
```

- [ ] **Step 3: Create `knowledge/architecture.md`**

````markdown
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
                          +------------------+        +------------------+
                          | webapp (Vercel)  | -----> | api (Vercel)     |
                          | React + Vite     |  CORS  | Hono             |
                          +------------------+        +------------------+
                                    ^                          ^
                                    |   packages/shared        |
                                    +------- Zod contract -----+
```

- `webapp` is a static site. It calls `api` over HTTPS using the base URL in `VITE_API_URL`.
- `api` is one Vercel serverless function. Every route is mounted on a single Hono app.
- `packages/shared` is TypeScript source consumed directly by both. There is no build step.
- `iosapp` loads `webapp` from `WEBAPP_URL`. It never calls `api` directly and never bundles web assets.

## URL configuration flow

| Consumer | Setting | Development value | Production value |
|---|---|---|---|
| `webapp` | `VITE_API_URL` (Vercel env var, `.env` locally) | `http://localhost:3000` | deployed api URL |
| `api` | `ALLOWED_ORIGINS` (Vercel env var, `.env` locally) | `http://localhost:5173` | deployed webapp origin |
| `iosapp` | `WEBAPP_URL` in `Config/Debug.xcconfig` and `Config/Release.xcconfig` | `http://localhost:5173` | deployed webapp URL |

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
- New API routes: create a router in `api/src/routes/`, mount it in `api/src/app.ts`, define the schema in `packages/shared`.
- Second JS package: add it to `pnpm-workspace.yaml` and extend `tsconfig.base.json`.
````

- [ ] **Step 4: Create the ADR template and the five ADRs**

`knowledge/decisions/TEMPLATE.md`:

```markdown
# NNNN Title in imperative or noun form

Date: YYYY-MM-DD
Status: Accepted | Superseded by NNNN | Deprecated

## Context

What situation forced a decision.
One sentence per line.

## Decision

What we chose.

## Alternatives considered

- Option: why it lost.

## Consequences

What becomes easier, what becomes harder, what to watch for.
```

`knowledge/decisions/0001-monorepo-with-pnpm-workspaces.md`:

```markdown
# 0001 Monorepo with pnpm workspaces

Date: 2026-09-23
Status: Accepted

## Context

The product has a website, a backend and a native iOS shell that must evolve together but deploy separately.
The website and backend share a request and response contract that must not drift.

## Decision

One git repository with a pnpm workspace for the JavaScript packages (`webapp`, `api`, `packages/*`) and a sibling `iosapp` directory outside the workspace.
Root level tooling (TypeScript base config, ESLint, Prettier, Vitest) is shared by every JS package.
No build orchestrator (Turborepo, Nx) until there are enough packages to need one.

## Alternatives considered

- Separate repositories: contract drift between webapp and api would be invisible until runtime, and agents would need to coordinate across repos.
- Turborepo from day one: adds a caching layer and config for three small packages that build in seconds.

## Consequences

- One `pnpm check` verifies everything JS.
- Vercel needs two projects pointing at the same repo with different root directories.
- Adding an orchestrator later is a contained change to root `package.json` scripts.
```

`knowledge/decisions/0002-ios-shell-loads-remote-webapp.md`:

```markdown
# 0002 iOS shell loads the remote webapp

Date: 2026-09-23
Status: Accepted

## Context

Users must be able to use the website on its own or through the iOS app.
The website must build and deploy without any involvement from the iOS app.

## Decision

The iOS app is a thin shell whose WKWebView loads the deployed website from a URL configured per build configuration.
It bundles no web assets.
Debug builds point at the local Vite dev server, Release builds at the production URL.

## Alternatives considered

- Bundle the Vite build inside the app: works offline, but every web change requires an app release and the two deploy pipelines become coupled.
- Bundle plus dev server: same coupling in release.

## Consequences

- Web updates reach iOS users instantly with no App Store release.
- The app is useless offline, so a visible offline state with retry is mandatory.
- App Store review may ask what native value the app adds beyond the website. Plan native features (push, bridge) with that in mind.
```

`knowledge/decisions/0003-xcodegen-for-ios-project.md`:

```markdown
# 0003 XcodeGen for the iOS project

Date: 2026-09-23
Status: Accepted

## Context

Development happens largely on Windows where Xcode does not run.
`project.pbxproj` files are opaque, merge badly and are error prone to hand edit.

## Decision

Describe the Xcode project in `iosapp/project.yml` and generate `BBT.xcodeproj` with `xcodegen generate` on a Mac.
The generated project is gitignored.

## Alternatives considered

- Commit a hand written `.xcodeproj`: cannot be validated on Windows and produces unreadable diffs.
- Tuist: more capable but heavier for a single target app.

## Consequences

- Every Mac that builds the app needs `brew install xcodegen`.
- Target settings live in a readable YAML file agents can edit safely.
- `project.yml` can be validated as YAML on any machine, but only a Mac proves it builds.
```

`knowledge/decisions/0004-hono-on-vercel-for-api.md`:

```markdown
# 0004 Hono on Vercel for the api

Date: 2026-09-23
Status: Accepted

## Context

The backend must be TypeScript, host on Vercel next to the webapp, and be easy to test.

## Decision

Hono, exposed as one Vercel serverless function through `hono/vercel`, with `@hono/node-server` for local development.
Zod validates every request boundary.

## Alternatives considered

- Express: heavier, weaker TypeScript types, awkward on Vercel functions.
- Next.js API routes: pulls in a framework we use nowhere else.
- Bare Vercel functions: no routing or middleware story, so each endpoint reinvents it.

## Consequences

- Tests call `app.request()` in process and are fast.
- There is intentionally no `build` script in `api/package.json`; Vercel compiles the function itself.
- Long running work must move to a queue or a different host; serverless functions have execution limits.
```

`knowledge/decisions/0005-shared-contract-package.md`:

```markdown
# 0005 Shared contract package

Date: 2026-09-23
Status: Accepted

## Context

`webapp` and `api` agree on request and response shapes.
Duplicated types drift silently.

## Decision

`packages/shared` (`@bbt/shared`) holds Zod schemas and their inferred types.
`api` parses outgoing responses with them, `webapp` parses incoming responses with them.
The package exports TypeScript source directly (`exports: "./src/index.ts"`) and has no build step.

## Alternatives considered

- Duplicate types in each package: drift is the problem being solved.
- Build shared to `dist` with `tsc`: forces a build ordering on every consumer and on both Vercel projects for no runtime benefit.
- Generate types from an OpenAPI document: worthwhile later if external clients appear.

## Consequences

- Any API shape change starts in `packages/shared`, and TypeScript fails in whichever consumer is not updated.
- Consumers must be able to compile TypeScript from `node_modules`. Vite, tsx, Vitest, `tsc` and Vercel's function bundler all can.
```

- [ ] **Step 5: Create the three root skills**

`.claude/skills/verify-all/SKILL.md`:

````markdown
---
name: verify-all
description: Use when finishing any change in this repo, before declaring work done or opening a PR. Runs every check across the workspace and reports results faithfully, including what could not be verified.
---

# Verify All

## Steps

1. From the repo root run:

   ```powershell
   pnpm check
   ```

   This runs lint, typecheck, test, build and Prettier check across `webapp`, `api` and `packages/shared`.

2. If anything fails, fix the cause. Do not skip, disable or mark tests as expected failures to get green.
   Formatting failures: run `pnpm format` and re-run `pnpm check`.

3. If you changed `webapp` behaviour, start `pnpm dev` and load `http://localhost:5173` in a browser.
   Confirm the page renders and `API: ok` appears.
   Stop the dev processes afterwards.

4. If you changed `iosapp`:
   - validate `iosapp/project.yml` parses: `pnpm dlx js-yaml iosapp/project.yml | Out-Null`
   - validate `iosapp/BBT/Info.plist` parses: `[xml](Get-Content iosapp/BBT/Info.plist -Raw) | Out-Null`
   - on a Mac only: `cd iosapp; xcodegen generate; xcodebuild -scheme BBT -destination 'platform=iOS Simulator,name=iPhone 16' test`

5. Report using this exact shape:

   ```
   Verified: <list of checks that ran and passed>
   Failed: <list with the first line of each failure, or "none">
   Not verified: <what could not run and why, for example "iosapp build (Windows, no Xcode)">
   ```

## Rules

- Never report green for something you did not run.
- A check that could not run is "Not verified", never "passed".
````

`.claude/skills/record-decision/SKILL.md`:

````markdown
---
name: record-decision
description: Use when making or discovering a non-obvious technical decision in this repo (a library choice, a structural rule, a rejected alternative). Writes a numbered ADR into knowledge/decisions and updates the index.
---

# Record Decision

## Steps

1. Find the next number: list `knowledge/decisions/` and add one to the highest `NNNN`.

2. Copy `knowledge/decisions/TEMPLATE.md` to `knowledge/decisions/NNNN-short-kebab-title.md`.

3. Fill every section.
   Context says what forced the decision.
   Decision says what was chosen in one or two sentences.
   Alternatives lists each option that lost and why, one bullet each.
   Consequences lists what becomes easier, harder, and what to watch for.
   Set `Date` to today and `Status` to `Accepted`.

4. Add one line under Decisions in `knowledge/INDEX.md`:

   ```
   - [NNNN Title](decisions/NNNN-short-kebab-title.md)
   ```

5. If the decision supersedes an older ADR, change that ADR's `Status` to `Superseded by NNNN`.

6. Commit the ADR with the change it explains, or on its own with the message `Record ADR NNNN: <title>`.

## Rules

- One sentence per line, no em dashes.
- Do not record decisions that are already obvious from the code or from an existing ADR.
- Never edit the Decision section of an accepted ADR. Write a new one that supersedes it.
````

`.claude/skills/update-knowledge/SKILL.md`:

````markdown
---
name: update-knowledge
description: Use after changing how anything in this repo works (config flow, commands, conventions, boundaries between projects, ports, environment variables). Decides which knowledge document is affected and updates it in the same change.
---

# Update Knowledge

## Steps

1. Ask which of these your change touched:

   | Changed | Update |
   |---|---|
   | How projects connect, URLs, CORS, user agent, safe areas | `knowledge/architecture.md` |
   | Commands, formatting, testing rules, ports | `knowledge/conventions.md` and the relevant `CLAUDE.md` Commands section |
   | A word people would need defined | `knowledge/glossary.md` |
   | Why something is the way it is | a new ADR via `record-decision` |
   | `webapp` internals | `webapp/knowledge/` |
   | `api` internals or deployment | `api/knowledge/` |
   | `iosapp` internals or configuration | `iosapp/knowledge/` |

2. Open the target document and edit the paragraph that is now wrong.
   Prefer replacing a sentence over appending a note.

3. If you created a new document, add a one line entry to that folder's `INDEX.md`.

4. If a `CLAUDE.md` would grow past about 60 lines, move detail into `knowledge/` and leave a pointer.

5. Re-read the edited document once, top to bottom, to check nothing else it says has become false.

6. Commit the documentation change together with the code change.

## Rules

- One sentence per line, no em dashes.
- Facts go in `knowledge/`, procedures go in `.claude/skills/`, always-on rules go in `CLAUDE.md`.
- Do not duplicate content between levels. Link instead.
````

- [ ] **Step 6: Format check and commit**

```powershell
pnpm format:check
```

Expected: pass. If Prettier reformats Markdown tables, that is fine; run `pnpm format` and confirm sentences remain one per line.

```powershell
git add -A
git commit -m "Add root CLAUDE.md, knowledge base, ADRs and repo-level skills"
```

---

### Task 8: `webapp` agent infrastructure

**Files:**
- Create: `webapp/CLAUDE.md`, `webapp/.claude/skills/add-feature/SKILL.md`, `webapp/.claude/skills/check/SKILL.md`, `webapp/knowledge/INDEX.md`, `webapp/knowledge/stack.md`, `webapp/knowledge/testing.md`, `webapp/knowledge/ios-integration.md`, `webapp/knowledge/api-client.md`

- [ ] **Step 1: Create `webapp/CLAUDE.md`**

```markdown
# webapp

## Purpose

The BBT website.
React 19 + TypeScript built with Vite, deployed to Vercel as a static site.
It runs in any browser and inside the `iosapp` WKWebView, and must behave identically in both.

## Commands (run from `webapp/` or with `pnpm --filter @bbt/webapp <script>`)

- `pnpm dev` - Vite dev server on http://localhost:5173 (strict port).
- `pnpm test` - Vitest with jsdom and React Testing Library.
- `pnpm lint`, `pnpm typecheck`, `pnpm build` - ESLint, `tsc --noEmit`, `vite build` to `dist/`.
- Needs `api` running on port 3000 for the health status to show `ok`. `pnpm dev` at the repo root starts both.

## Rules

- Test first. Use the `add-feature` skill for any new behaviour.
- Query the DOM by role and text in tests, never by class name.
- Only `src/config.ts` reads `import.meta.env`. Only `src/api/client.ts` calls `fetch` against the API.
- Parse every API response with the schema from `@bbt/shared`. Never hand write a response type.
- Do not add iOS only code paths beyond `isInIosShell()` checks. The site must work without the shell.
- Keep `index.html` `viewport-fit=cover` and the `env(safe-area-inset-*)` padding in `styles.css`.
- Never break `pnpm build`. The deploy is the static build.

## Where to look

- `knowledge/INDEX.md` - start here.
- `knowledge/ios-integration.md` - what the shell does and does not do for you.
- `knowledge/api-client.md` - how to call the API.
- Skills: `.claude/skills/add-feature`, `.claude/skills/check`.
- Agency agent: `front-end-engineer` (see root `CLAUDE.md`).
```

- [ ] **Step 2: Create the two webapp skills**

`webapp/.claude/skills/add-feature/SKILL.md`:

````markdown
---
name: add-feature
description: Use when adding or changing user visible behaviour in webapp (a component, a page, a state change, an API call). Test-first flow ending in a browser check.
---

# Add Feature (webapp)

## Steps

1. If the feature needs new API data, stop and do the contract first: schema in `packages/shared`, route in `api`, then come back.
   See `api/.claude/skills/add-endpoint`.

2. Write the failing test next to the code it tests (`Thing.test.tsx` beside `Thing.tsx`).
   Render with `@testing-library/react`, query by role or text, assert with `jest-dom` matchers.
   Mock `../api/client` with `vi.mock` when the component fetches.

3. Run `pnpm --filter @bbt/webapp test` and confirm it fails for the right reason.

4. Implement the smallest change that passes.
   Components live in `src/components/`, API calls in `src/api/client.ts`, config in `src/config.ts`.

5. Run `pnpm --filter @bbt/webapp test` and confirm it passes.

6. Run `pnpm --filter @bbt/webapp lint` and `pnpm --filter @bbt/webapp typecheck`.

7. Start `pnpm dev` at the repo root and load http://localhost:5173.
   Look at the feature at phone width (about 390px) as well as desktop, because the primary surface is the iOS shell.
   Check the console for errors.

8. If the change alters how the webapp talks to the API or the shell, update `knowledge/api-client.md` or `knowledge/ios-integration.md`.

9. Run the root `verify-all` skill and commit.
````

`webapp/.claude/skills/check/SKILL.md`:

````markdown
---
name: check
description: Use when you need to know whether webapp is green. Runs lint, typecheck, tests and the production build for webapp only and states what green means.
---

# Check (webapp)

## Steps

1. Run from the repo root:

   ```powershell
   pnpm --filter @bbt/webapp lint
   pnpm --filter @bbt/webapp typecheck
   pnpm --filter @bbt/webapp test
   pnpm --filter @bbt/webapp build
   ```

2. Green means: zero ESLint errors, `tsc` exits 0, every Vitest test passes, and `webapp/dist/index.html` exists.

3. On failure, fix the cause. Never disable a rule or skip a test to pass.

4. Report each of the four commands as passed or failed with the first line of any failure.
````

- [ ] **Step 3: Create the webapp knowledge base**

`webapp/knowledge/INDEX.md`:

```markdown
# webapp Knowledge Index

- [Stack](stack.md) - what is installed and why, and where each piece is configured.
- [Testing](testing.md) - how tests are written and what to test.
- [iOS integration](ios-integration.md) - the user agent token, viewport and safe areas, and what the shell does and does not do.
- [API client](api-client.md) - how the webapp calls api using the shared contract.
```

`webapp/knowledge/stack.md`:

```markdown
# Stack

| Piece | Role | Configured in |
|---|---|---|
| Vite | dev server and production bundler | `vite.config.ts` |
| React 19 | UI | `src/main.tsx` mounts `App` under `StrictMode` |
| TypeScript (strict) | types | `tsconfig.json` extends `../tsconfig.base.json` |
| ESLint | lint, with `react-hooks` rules | root `eslint.config.mjs`, block scoped to `webapp/**` |
| Prettier | formatting | root `.prettierrc` |
| Vitest + jsdom | test runner and DOM | `test` block in `vite.config.ts` |
| React Testing Library + jest-dom | rendering and matchers | `src/test/setup.ts` |
| `@bbt/shared` | response schemas | workspace dependency |

## Notes

- `verbatimModuleSyntax` is on. Import types with `import type` or inline `type` modifiers.
- The dev server uses `strictPort: true` so a busy 5173 fails loudly instead of moving to 5174 (which would break CORS and the iOS Debug URL).
- `VITE_API_URL` is the only environment variable. Copy `.env.example` to `.env` to override locally.
- `vercel.json` declares the `vite` framework and a single page app rewrite to `index.html`.

## Deployment

- Vercel project with **Root Directory** `webapp` and framework preset Vite. Vercel installs from the repository root because it detects the pnpm workspace, so `@bbt/shared` resolves.
- Build command `pnpm build`, output directory `dist` (both are the Vite defaults).
- Environment variable `VITE_API_URL` set to the deployed api URL with no trailing slash. It is baked in at build time, so changing it requires a redeploy.
- After deploying, add this site's origin to the api project's `ALLOWED_ORIGINS`, then set `WEBAPP_URL` in `iosapp/Config/Release.xcconfig` to this URL.
```

`webapp/knowledge/testing.md`:

```markdown
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
```

`webapp/knowledge/ios-integration.md`:

```markdown
# iOS Integration

## What the shell does

- Loads the site at `WEBAPP_URL` in a full screen WKWebView with no browser chrome.
- Appends `BBTiOS/<app version>` to the user agent.
  Detect it with `isInIosShell()` from `src/platform.ts`.
- Shows its own spinner until the first navigation finishes, and its own offline screen with a retry button if navigation fails.
- Places the webview edge to edge. It does not apply safe area insets.

## What the shell does not do

- It does not bundle or cache the site. If the network is down the shell shows its offline screen, not the site.
- It does not expose any JavaScript bridge yet. `window.webkit.messageHandlers` is empty.
- It does not intercept links. Every navigation stays inside the webview.
- It does not call the API. All API traffic originates from the webapp's origin.

## Your responsibilities

- Keep `viewport-fit=cover` in `index.html` and the `env(safe-area-inset-*)` padding on `body` in `styles.css`, otherwise content sits under the notch and home indicator.
- Keep `isInIosShell()` cosmetic. Hiding a "get the app" banner is fine; gating features is not.
- Keep every page usable at 390px wide.

## Changing the user agent token

Change `IOS_SHELL_USER_AGENT_TOKEN` in `src/platform.ts` and `AppConfig.userAgentProduct` in `iosapp/BBT/AppConfig.swift` in the same commit, and update `knowledge/architecture.md` at the root.
```

`webapp/knowledge/api-client.md`:

````markdown
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
````

- [ ] **Step 4: Format check and commit**

```powershell
pnpm format:check
git add -A
git commit -m "Add webapp CLAUDE.md, skills and knowledge base"
```

---

### Task 9: `api` agent infrastructure

**Files:**
- Create: `api/CLAUDE.md`, `api/.claude/skills/add-endpoint/SKILL.md`, `api/.claude/skills/check/SKILL.md`, `api/.claude/skills/run-local/SKILL.md`, `api/knowledge/INDEX.md`, `api/knowledge/stack.md`, `api/knowledge/routing-and-validation.md`, `api/knowledge/deployment.md`

- [ ] **Step 1: Create `api/CLAUDE.md`**

```markdown
# api

## Purpose

The BBT backend.
Hono + TypeScript, deployed to Vercel as a single serverless function.
Serves `webapp` only; the iOS shell never calls it directly.

## Commands (run from `api/` or with `pnpm --filter @bbt/api <script>`)

- `pnpm dev` - `tsx watch src/server.ts` on http://localhost:3000. Copy `.env.example` to `.env` to change settings.
- `pnpm test` - Vitest, in process via `app.request()`. No port is opened.
- `pnpm lint`, `pnpm typecheck` - ESLint and `tsc --noEmit`.
- There is intentionally no `build` script. Vercel compiles `api/index.ts` itself.

## Rules

- Every request boundary is validated with Zod. Every response is parsed against its schema from `@bbt/shared` before it is sent.
- Contract changes start in `packages/shared`, then here, then `webapp`.
- Only `src/env.ts` reads `process.env`. Add new variables to its schema and to `.env.example`.
- `createApp(env)` must stay pure with respect to environment so tests can construct it.
- One router per file in `src/routes/`, mounted in `src/app.ts`.
- Use the `add-endpoint` skill for new routes.
- CORS origins come from `ALLOWED_ORIGINS`. Never use `*`.

## Where to look

- `knowledge/INDEX.md` - start here.
- `knowledge/routing-and-validation.md` - how routes and schemas fit together.
- `knowledge/deployment.md` - Vercel project settings and environment variables.
- Skills: `.claude/skills/add-endpoint`, `.claude/skills/check`, `.claude/skills/run-local`.
- Agency agent: `back-end-engineer` (see root `CLAUDE.md`).
```

- [ ] **Step 2: Create the three api skills**

`api/.claude/skills/add-endpoint/SKILL.md`:

````markdown
---
name: add-endpoint
description: Use when adding or changing an api route. Contract-first, test-first flow that keeps packages/shared, api and webapp in step.
---

# Add Endpoint (api)

## Steps

1. Define the contract in `packages/shared/src/<resource>.ts`:
   a Zod schema for the request body or query (if any) and one for the response, plus inferred types.
   Export both from `packages/shared/src/index.ts`.
   Add a test in `packages/shared/test/` that a valid object passes and an invalid one fails.

2. Write the failing route test in `api/test/<resource>.test.ts`:

   ```ts
   const app = createApp({ ALLOWED_ORIGINS: 'http://localhost:5173', PORT: 3000 });
   const res = await app.request('/things', { method: 'POST', body: JSON.stringify(input), headers: { 'content-type': 'application/json' } });
   expect(res.status).toBe(201);
   expect(ThingResponseSchema.safeParse(await res.json()).success).toBe(true);
   ```

   Cover: success, invalid input returns 400 with a JSON error, and any not found case.

3. Run `pnpm --filter @bbt/api test` and confirm the new test fails for the right reason.

4. Create `api/src/routes/<resource>.ts` exporting `export const <resource>Routes = new Hono()...`.
   Validate input with `schema.safeParse` and return `c.json({ error: ... }, 400)` on failure.
   Build the response as the inferred type and return `c.json(ResponseSchema.parse(body))`.

5. Mount it in `api/src/app.ts`: `app.route('/things', thingRoutes)`.

6. Run `pnpm --filter @bbt/api test`, `lint`, `typecheck`.

7. Add the webapp client function (see `webapp/knowledge/api-client.md`) if the webapp will call it.

8. Update `api/knowledge/routing-and-validation.md` if you introduced a new pattern, and run the root `verify-all` skill.
````

`api/.claude/skills/check/SKILL.md`:

````markdown
---
name: check
description: Use when you need to know whether api is green. Runs lint, typecheck and tests for api only and states what green means.
---

# Check (api)

## Steps

1. Run from the repo root:

   ```powershell
   pnpm --filter @bbt/api lint
   pnpm --filter @bbt/api typecheck
   pnpm --filter @bbt/api test
   ```

2. Green means zero ESLint errors, `tsc` exits 0, and every Vitest test passes.
   There is no build step to check.

3. On failure, fix the cause. Never disable a rule or skip a test to pass.

4. Report each command as passed or failed with the first line of any failure.
````

`api/.claude/skills/run-local/SKILL.md`:

````markdown
---
name: run-local
description: Use when you need the api running locally to test against, from the webapp or with curl. Starts it, proves it answers, and stops it cleanly.
---

# Run Local (api)

## Steps

1. Optional: copy `api/.env.example` to `api/.env` and edit. Defaults are `ALLOWED_ORIGINS=http://localhost:5173`, `PORT=3000`.

2. Start in the background from the repo root:

   ```powershell
   $api = Start-Process -FilePath pnpm -ArgumentList '--filter','@bbt/api','dev' -PassThru -NoNewWindow
   Start-Sleep -Seconds 4
   ```

3. Prove it answers:

   ```powershell
   Invoke-RestMethod http://localhost:3000/health
   ```

   Expected: `status ok`, `service bbt-api`, an ISO timestamp.

4. Do your testing. `tsx watch` reloads on every save.

5. Stop it:

   ```powershell
   Stop-Process -Id $api.Id -Force
   Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
   ```

   The second line clears any orphaned watcher. Skip it if other Node processes you care about are running.

## Notes

- To run api and webapp together use `pnpm dev` at the repo root instead.
- Port in use: something else holds 3000. Find it with `Get-NetTCPConnection -LocalPort 3000`.
````

- [ ] **Step 3: Create the api knowledge base**

`api/knowledge/INDEX.md`:

```markdown
# api Knowledge Index

- [Stack](stack.md) - what is installed and why, and where each piece is configured.
- [Routing and validation](routing-and-validation.md) - how the app is assembled, how routes validate, and error shapes.
- [Deployment](deployment.md) - Vercel project settings, environment variables and how the entrypoint works.
```

`api/knowledge/stack.md`:

```markdown
# Stack

| Piece | Role | Configured in |
|---|---|---|
| Hono | router and middleware | `src/app.ts` |
| `hono/cors` | CORS allowlist | `src/app.ts` from `ALLOWED_ORIGINS` |
| `hono/vercel` | adapts the app to a Vercel function | `api/index.ts` |
| `@hono/node-server` + `tsx` | local dev server with reload | `src/server.ts`, `dev` script |
| Zod | environment and boundary validation | `src/env.ts`, routes |
| `@bbt/shared` | contract schemas | workspace dependency |
| TypeScript (strict) | types | `tsconfig.json` extends `../tsconfig.base.json` with `types: ["node"]` |
| Vitest | tests via `app.request()` | default config, `test/**/*.test.ts` |

## Notes

- `type: module` and `moduleResolution: Bundler`. Relative imports have no extensions; tsx, Vitest and Vercel's bundler all resolve them.
- `Env` is the parsed shape of `process.env`. `createApp(env)` takes it as a parameter so tests never touch `process.env`.
- Logging middleware is intentionally absent. Vercel records requests. Add `hono/logger` only if local debugging needs it.
```

`api/knowledge/routing-and-validation.md`:

```markdown
# Routing and Validation

## Assembly

`createApp(env)` in `src/app.ts`:

1. registers CORS for the origins in `env.ALLOWED_ORIGINS`;
2. mounts each router from `src/routes/` at its path prefix;
3. sets a JSON `notFound` handler (`404 { error: 'Not found' }`);
4. sets a JSON `onError` handler (`500 { error: 'Internal server error' }`) that logs the error.

`src/server.ts` and `api/index.ts` both call `createApp(loadEnv())`.
Nothing else constructs the app.

## Routers

One file per resource in `src/routes/`, exporting `<resource>Routes = new Hono()` with its handlers chained.
Paths inside the router are relative; the prefix is given at mount time in `app.ts`.

## Validation

- Input: `Schema.safeParse(await c.req.json())` or of `c.req.query()`.
  On failure return `c.json({ error: 'Invalid request', issues: result.error.issues }, 400)`.
- Output: build the body as the inferred type, then `c.json(ResponseSchema.parse(body))`.
  A contract violation throws and becomes a 500 in tests rather than a silent mismatch in production.
- Schemas live in `packages/shared`, never inline in a route.

## Error shape

Every error response is JSON with an `error` string.
Validation errors add `issues` from Zod.
Do not leak stack traces or internal messages.

## CORS

`origin` is the parsed allowlist array.
Hono echoes the request origin only when it matches, and omits the header otherwise.
Preflight `OPTIONS` requests are handled by the middleware automatically.
```

`api/knowledge/deployment.md`:

```markdown
# Deployment

## Vercel project

- Import the git repository into Vercel and set **Root Directory** to `api`.
- Framework preset: Other.
- Vercel detects the pnpm workspace and installs from the repository root, so `@bbt/shared` resolves.
- Build command: leave empty. There is no `build` script on purpose.
  Vercel compiles `api/api/index.ts` (the `api/` folder inside the project) into one Node serverless function.
- `vercel.json` rewrites every path to `/api/index`, so Hono sees the full path.

## Environment variables

| Name | Purpose | Production value |
|---|---|---|
| `ALLOWED_ORIGINS` | comma separated CORS allowlist | the deployed webapp origin, for example `https://bbt.vercel.app` |

`PORT` is ignored on Vercel.

## After deploying

1. `GET https://<api-domain>/health` returns the health JSON.
2. Set `VITE_API_URL` in the webapp Vercel project to `https://<api-domain>` and redeploy the webapp.
3. Load the webapp and confirm `API: ok` with no CORS error in the console.

## Limits to remember

- Serverless execution time and payload limits apply. Long jobs need a queue or another host.
- Cold starts happen. Keep the function's import graph small.
```

- [ ] **Step 4: Format check and commit**

```powershell
pnpm format:check
git add -A
git commit -m "Add api CLAUDE.md, skills and knowledge base"
```

---

### Task 10: `iosapp` agent infrastructure

**Files:**
- Create: `iosapp/CLAUDE.md`, `iosapp/.claude/skills/regenerate-project/SKILL.md`, `iosapp/.claude/skills/point-at-webapp/SKILL.md`, `iosapp/knowledge/INDEX.md`, `iosapp/knowledge/project-generation.md`, `iosapp/knowledge/webview.md`, `iosapp/knowledge/configuration.md`

- [ ] **Step 1: Create `iosapp/CLAUDE.md`**

```markdown
# iosapp

## Purpose

The native iOS shell for BBT.
SwiftUI app whose single screen is a WKWebView loading the deployed `webapp`.
No product UI lives here; the shell owns configuration, loading state, the offline screen, and the user agent token.

## Commands (Mac only)

- `brew install xcodegen` once.
- `cd iosapp; xcodegen generate` - produces `BBT.xcodeproj` from `project.yml`. Re-run after any change to `project.yml`, xcconfig files, or when files are added or removed.
- `open BBT.xcodeproj` and run the `BBT` scheme, or `xcodebuild -scheme BBT -destination 'platform=iOS Simulator,name=iPhone 16' test`.
- Debug builds load http://localhost:5173, so run `pnpm dev` at the repo root first.
- This project cannot be built or tested on Windows. Validate `project.yml`, `Info.plist` and asset JSON parse, then say so in your report.

## Rules

- Never commit `BBT.xcodeproj`. It is generated and gitignored.
- The web URL is set only in `Config/Debug.xcconfig` and `Config/Release.xcconfig` as `WEBAPP_URL`. Never hardcode a URL in Swift.
- In xcconfig, write URLs as `https:/$()/host` because `//` starts a comment.
- Only `AppConfig.swift` reads `Info.plist`. Only `WebView.swift` imports WebKit.
- Keep `ContentView` edge to edge; safe areas are the webapp's job.
- Swift 5.10, strict concurrency, `@MainActor` on anything touching WebKit or view state.
- Changing the user agent token also changes `webapp/src/platform.ts`. Do both in one commit.

## Where to look

- `knowledge/INDEX.md` - start here.
- `knowledge/configuration.md` - the xcconfig to Info.plist to runtime flow and its gotchas.
- `knowledge/webview.md` - how the webview is wired and where a JS bridge would go.
- Skills: `.claude/skills/regenerate-project`, `.claude/skills/point-at-webapp`.
- Agency agents: `front-end-engineer` for UI, `architect` for the shell to web contract. The agency has no iOS specialist; say so in reports.
```

- [ ] **Step 2: Create the two iosapp skills**

`iosapp/.claude/skills/regenerate-project/SKILL.md`:

````markdown
---
name: regenerate-project
description: Use on a Mac after changing project.yml, an xcconfig, or adding or removing Swift files in iosapp. Regenerates BBT.xcodeproj with XcodeGen and builds and tests in the simulator.
---

# Regenerate Project (iosapp)

## Steps

1. Ensure XcodeGen is installed: `xcodegen --version`. If missing: `brew install xcodegen`.

2. From `iosapp/`:

   ```bash
   xcodegen generate
   ```

   Expected: `Created project at .../BBT.xcodeproj`. Errors here are almost always YAML indentation or an unknown setting key in `project.yml`.

3. Build and test in the simulator:

   ```bash
   xcodebuild -scheme BBT -destination 'platform=iOS Simulator,name=iPhone 16' test
   ```

   Expected: `** TEST SUCCEEDED **`. Substitute an installed simulator name if iPhone 16 is unavailable (`xcrun simctl list devices available`).

4. For a manual run, `open BBT.xcodeproj`, choose the `BBT` scheme and a simulator, press Run.
   With the Debug configuration the app loads http://localhost:5173, so start `pnpm dev` at the repo root first.

5. Confirm `git status` shows no `BBT.xcodeproj`. It is gitignored; if it appears, the ignore file was changed.

## On Windows

You cannot run steps 1 to 4.
Validate the inputs instead and report "Not verified: iosapp build (Windows)":

```powershell
pnpm dlx js-yaml iosapp/project.yml | Out-Null
[xml](Get-Content iosapp/BBT/Info.plist -Raw) | Out-Null
```
````

`iosapp/.claude/skills/point-at-webapp/SKILL.md`:

````markdown
---
name: point-at-webapp
description: Use when the iOS shell must load a different webapp URL (local dev server, a Vercel preview, production). Edits the right xcconfig safely.
---

# Point At Webapp (iosapp)

## Steps

1. Decide which configuration changes:
   - `Config/Debug.xcconfig` for what runs from Xcode.
   - `Config/Release.xcconfig` for archives and TestFlight or App Store builds.

2. Edit the `WEBAPP_URL` line. Write `//` as `/$()/`:

   ```
   WEBAPP_URL = https:/$()/bbt-git-feature-x.vercel.app
   ```

   For a physical device against your Mac's dev server use the Mac's LAN IP, for example `http:/$()/192.168.1.20:5173`, and start Vite with `--host`.

3. Regenerate and rebuild with the `regenerate-project` skill (Mac). xcconfig changes are picked up on the next build without regenerating, but regenerating is cheap and removes doubt.

4. Verify the value that reached the app: with the app running in the simulator, the loaded page's origin must match. If the app shows the configuration error screen, the URL failed validation in `AppConfig`; the most common cause is a bare `//`.

5. Do not commit a Debug URL into Release, and do not commit personal LAN IPs. Revert local experiments before committing.
````

- [ ] **Step 3: Create the iosapp knowledge base**

`iosapp/knowledge/INDEX.md`:

```markdown
# iosapp Knowledge Index

- [Project generation](project-generation.md) - project.yml anatomy, targets, and how to add files or dependencies.
- [WebView](webview.md) - how WKWebView is wired, the loading states, and the JavaScript bridge extension point.
- [Configuration](configuration.md) - the xcconfig to Info.plist to runtime flow and its gotchas.
```

`iosapp/knowledge/project-generation.md`:

````markdown
# Project Generation

`project.yml` is the source of truth for `BBT.xcodeproj`.
XcodeGen reads it and writes the project; the project is never edited by hand and never committed.

## Anatomy

- `options`: bundle id prefix, iOS 17 deployment target, intermediate groups so folders map to Xcode groups.
- `configs`: `Debug` and `Release`.
- `configFiles`: maps each config to `Config/<Config>.xcconfig`. This is where `WEBAPP_URL` comes from.
- `settings.base`: Swift 5.10, version numbers, automatic signing, strict concurrency.
- `targets.BBT`: the app. Sources are everything under `BBT/`. Uses the hand written `BBT/Info.plist` (`GENERATE_INFOPLIST_FILE: NO`).
- `targets.BBTTests`: XCTest bundle depending on `BBT`. Sources under `BBTTests/`. Uses `@testable import BBT`.
- `schemes.BBT`: builds both, runs Debug, tests Debug, archives Release.

## Adding a Swift file

Put it under `BBT/` (or `BBTTests/` for tests) and run `xcodegen generate`.
Folder based sources mean no per-file registration.

## Adding a Swift package dependency

```yaml
packages:
  SomeLib:
    url: https://github.com/org/somelib
    from: "1.0.0"
targets:
  BBT:
    dependencies:
      - package: SomeLib
```

Then regenerate.

## Adding a capability or entitlement

Add an `entitlements` block to the target with a path to a `.entitlements` file you create, and regenerate.
Record why in an ADR if it affects the shell's contract with the webapp.
````

`iosapp/knowledge/webview.md`:

```markdown
# WebView

## Pieces

- `WebView.swift`: `UIViewRepresentable` around `WKWebView`. The only file importing WebKit.
- `WebViewModel.swift`: `@Observable` state machine, `loading`, `loaded`, `failed(message:)`.
- `ContentView.swift`: composes the two, overlays a spinner or `OfflineView`.
- `StatusViews.swift`: `OfflineView` (retry) and `ConfigurationErrorView` (bad `WEBAPP_URL`).

## Setup details

- `applicationNameForUserAgent` keeps WebKit's default `Mobile/<build>` token and appends `BBTiOS/<version>`.
  Replacing the default entirely makes some sites think the client is desktop.
- `scrollView.contentInsetAdjustmentBehavior = .never` so the webview does not add its own safe area padding on top of the CSS insets.
- `isOpaque = false` with a system background so the first paint matches the app background instead of flashing white.
- `allowsInlineMediaPlayback = true` so video does not force fullscreen.

## Navigation delegate

`Coordinator` implements `WKNavigationDelegate`:

- `didStartProvisionalNavigation` sets `loading`.
- `didFinish` sets `loaded`.
- `didFail` and `didFailProvisionalNavigation` set `failed` with the error's description.

## Retry

`ContentView` holds `reloadToken`.
The retry button increments it; `updateUIView` notices the change and calls `load` again.
This avoids holding a reference to the `WKWebView` in SwiftUI state.

## Adding a JavaScript bridge

1. Define the message schema in `packages/shared` first, so the webapp and shell agree.
2. In `WebView.makeUIView`, at the marked extension point, add a `WKScriptMessageHandler` to `configuration.userContentController` under a name such as `bbt`.
3. In the webapp, post with `window.webkit?.messageHandlers?.bbt?.postMessage(payload)` behind an `isInIosShell()` check.
4. For Swift to JavaScript, call `webView.evaluateJavaScript` from the coordinator.
5. Record the decision with the root `record-decision` skill and update `knowledge/architecture.md`.

## Not handled yet

- External links open inside the webview. Add a `decidePolicyFor` implementation to route other hosts to Safari when needed.
- No pull to refresh. Add a `UIRefreshControl` to `webView.scrollView` if wanted.
```

`iosapp/knowledge/configuration.md`:

````markdown
# Configuration

## Flow

```
Config/Debug.xcconfig       WEBAPP_URL = http:/$()/localhost:5173
Config/Release.xcconfig     WEBAPP_URL = https:/$()/REPLACE_WITH_PRODUCTION_HOST
        |
        v  (build setting)
BBT/Info.plist              <key>WEBAPP_URL</key><string>$(WEBAPP_URL)</string>
        |
        v  (runtime)
AppConfig.load()            Bundle.main.object(forInfoDictionaryKey: "WEBAPP_URL")
        |
        v
ContentView(config:)        WebView(url: config.webAppURL, ...)
```

## Gotchas

- `//` starts a comment in xcconfig. `WEBAPP_URL = https://host` yields `https:`. Write `https:/$()/host`; `$()` expands to nothing.
- `AppConfig` rejects anything that is not `http` or `https` with a host, so the mistake above shows `ConfigurationErrorView` instead of a blank screen.
- `Info.plist` is one file for all configurations. Anything that must differ per configuration goes through a build setting like `WEBAPP_URL`.
- `NSAllowsLocalNetworking` in `Info.plist` permits plain HTTP to localhost and LAN addresses in every configuration. It has no effect on production HTTPS traffic and Apple does not require justification for it.
- Version and build come from `MARKETING_VERSION` and `CURRENT_PROJECT_VERSION` in `project.yml`. `AppConfig.appVersion` reads `CFBundleShortVersionString`, which is `MARKETING_VERSION`.

## Adding a setting

1. Add `NAME = value` to both xcconfig files.
2. Add `<key>NAME</key><string>$(NAME)</string>` to `Info.plist`.
3. Read it in `AppConfig.load()` and validate it. Throw an `AppConfigError` case if it is invalid.
4. Add a test in `BBTTests/AppConfigTests.swift`.
5. Document it in the flow above and in `knowledge/architecture.md` at the root if the webapp depends on it.
````

- [ ] **Step 4: Commit**

Prettier ignores `iosapp/`, so no format check is needed here.

```powershell
git add -A
git commit -m "Add iosapp CLAUDE.md, skills and knowledge base"
```

---

### Task 11: `packages/shared` CLAUDE.md, root README, final verification

**Files:**
- Create: `packages/shared/CLAUDE.md`, `README.md`

- [ ] **Step 1: Create `packages/shared/CLAUDE.md`**

```markdown
# packages/shared (`@bbt/shared`)

## Purpose

The contract between `webapp` and `api`: Zod schemas and their inferred TypeScript types.
If a shape lives here, neither side can drift without TypeScript or a runtime parse failing.

## Commands

- `pnpm --filter @bbt/shared test|lint|typecheck`.
- There is no build. `package.json` exports `./src/index.ts` and every consumer compiles the source.

## Rules

- Any API shape change starts here, then `api`, then `webapp`.
- One file per resource in `src/`, re-exported from `src/index.ts` with explicit `export { Schema }` and `export type { Type }` lines.
- Every schema has a test in `test/` with at least one passing and one failing example.
- Use `z.iso.datetime()` for timestamps, `z.literal` for fixed strings, and never `z.any()`.
- Only `zod` may be a dependency. This package must stay free of runtime side effects.
- Do not add a build step. See root `knowledge/decisions/0005-shared-contract-package.md`.

## Where to look

- Root `knowledge/architecture.md` for how the contract is used on both sides.
- `api/.claude/skills/add-endpoint` for the contract-first flow.
- Agency agent: `back-end-engineer` (see root `CLAUDE.md`).
```

- [ ] **Step 2: Create `README.md`**

````markdown
# BBT App

A website, its backend, and a native iOS shell that loads the website.

| Project | Stack | Deploys to |
|---|---|---|
| `webapp/` | React 19, TypeScript, Vite | Vercel (static) |
| `api/` | Hono, TypeScript, Zod | Vercel (serverless function) |
| `packages/shared/` | Zod schemas shared by webapp and api | consumed as source |
| `iosapp/` | SwiftUI, WKWebView, XcodeGen | App Store, built on a Mac |

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
````

- [ ] **Step 3: Run the complete verification**

```powershell
pnpm check
pnpm dlx js-yaml iosapp/project.yml | Out-Null; if ($?) { "project.yml OK" }
[xml](Get-Content iosapp/BBT/Info.plist -Raw) | Out-Null; if ($?) { "Info.plist OK" }
git status --short
```

Expected: `pnpm check` green, both OK lines, and `git status` shows only the two new files.

- [ ] **Step 4: Confirm no forbidden files are tracked**

```powershell
git ls-files | Select-String -Pattern 'xcodeproj|\.vercel/|node_modules|/dist/|^\.env$'
```

Expected: no output.

- [ ] **Step 5: Confirm every knowledge INDEX links only to files that exist**

```powershell
Get-ChildItem -Recurse -Filter INDEX.md | ForEach-Object {
  $dir = $_.DirectoryName
  Select-String -Path $_.FullName -Pattern '\]\(([^)]+)\)' -AllMatches | ForEach-Object { $_.Matches } | ForEach-Object {
    $target = Join-Path $dir $_.Groups[1].Value
    if (-not (Test-Path $target)) { "MISSING: $target" }
  }
}
```

Expected: no `MISSING:` lines.

- [ ] **Step 6: Commit**

```powershell
git add -A
git commit -m "Add shared package CLAUDE.md and repository README"
git log --oneline
```

Expected: eleven or twelve commits from the spec onward.

- [ ] **Step 7: Final report**

Report using the `verify-all` shape:

```
Verified: pnpm check (lint, typecheck, test, build, format) for @bbt/shared, @bbt/api, @bbt/webapp; api /health over HTTP with CORS header; webapp served with viewport-fit=cover; project.yml, Info.plist and asset JSON parse; no forbidden files tracked; knowledge indexes link to existing files.
Failed: none
Not verified: iosapp compile, XCTest run and simulator behaviour (Windows, no Xcode); Vercel deployments (no Vercel projects yet); agency agent definitions (only ._ sidecar files are synced locally).
```
