# Kang Tea App Monorepo (codename BBT)

## Purpose

Kang Tea (康緹) is a bubble tea shop.
This repo, codenamed BBT, holds its standalone website (`webapp`), the backend (`api`), and a native iOS shell (`iosapp`) that loads the deployed website in a WKWebView.
User facing copy says Kang Tea; internal identifiers (package names, bundle id, Xcode target, API service id) say BBT.
Each project builds and deploys independently.
`packages/shared` holds the typed contract between `webapp` and `api`.

## Repo map

| Path                | What                                            | Read first                  |
| ------------------- | ----------------------------------------------- | --------------------------- |
| `webapp/`           | React + TypeScript site on Vercel               | `webapp/CLAUDE.md`          |
| `api/`              | Hono + TypeScript backend on Vercel             | `api/CLAUDE.md`             |
| `packages/shared/`  | Zod schemas and types shared by webapp and api  | `packages/shared/CLAUDE.md` |
| `seed.json`         | Base catalogue (store, menu) for every database | `api/knowledge/database.md` |
| `iosapp/`           | SwiftUI WKWebView shell, XcodeGen project       | `iosapp/CLAUDE.md`          |
| `knowledge/`        | Durable facts about the whole repo              | `knowledge/INDEX.md`        |
| `docs/superpowers/` | Design specs and implementation plans           | latest spec                 |

## Who does the work

All development work on this repo is done through Tristan's agency at `C:\Users\trist\OneDrive\Desktop\tristans-agency`.
Read the agency's `CLAUDE.md` and `orchestration.md` first, then adopt the matching agent definition and its skills from `agents/<agent>/`.

| Work                                                        | Agent                                                                  |
| ----------------------------------------------------------- | ---------------------------------------------------------------------- |
| Structure, cross-project decisions, ADRs, new subsystems    | `architect`                                                            |
| `webapp` UI, components, state, browser verification        | `front-end-engineer`                                                   |
| `api` endpoints, data modelling, `packages/shared` contract | `back-end-engineer`                                                    |
| `iosapp` Swift, SwiftUI, WKWebView                          | `front-end-engineer` for UI, `architect` for the shell to web contract |
| Vercel deployment, PR creation, addressing review           | `delivery-engineer`                                                    |
| Acceptance criteria, end to end behaviour verification      | `acceptance-verification-engineer`                                     |
| Test strategy, PR correctness review                        | `qa-engineer`                                                          |
| Auth, secrets, CORS, threat modelling, security review      | `security-engineer`                                                    |
| `CLAUDE.md`, knowledge bases, READMEs, doc rot audits       | `technical-writer`                                                     |
| Analytics and event modelling                               | `data-engineer`                                                        |
| Visual design, design system alignment                      | `ui-ux-designer`                                                       |
| Scoping, prioritisation, requirements                       | `product-manager`                                                      |
| Coordinating multi-agent work, sequencing                   | `engineering-manager`                                                  |

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
- Menu and store changes are edits to `seed.json`, followed by the `db-seed` skill per environment. Never edit database rows by hand.
- Never commit `*.xcodeproj`, `.vercel/`, `.env` files, `node_modules` or `dist`.
- Report verification faithfully: if a check failed or could not be run (iOS on Windows), say so.
- Follow Tristan's global instructions: no em dashes, one sentence per line in long Markdown, no agent co-author lines in commits.

## Where to look

- How the pieces connect: `knowledge/architecture.md`.
- Conventions: `knowledge/conventions.md`.
- Why things are the way they are: `knowledge/decisions/`.
- Repo-level skills: `.claude/skills/` (`verify-all`, `record-decision`, `update-knowledge`, `db-seed`, `db-wipe`).
- Hooks: `.claude/settings.json` registers `.claude/hooks/responsive-ui-reminder.mjs`, which reminds you to run `webapp:responsive-ui` after editing any webapp `.tsx` or `.css` file.
