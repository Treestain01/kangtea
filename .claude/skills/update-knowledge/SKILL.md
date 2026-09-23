---
name: update-knowledge
description: Use after changing how anything in this repo works (config flow, commands, conventions, boundaries between projects, ports, environment variables). Decides which knowledge document is affected and updates it in the same change.
---

# Update Knowledge

## Steps

1. Ask which of these your change touched:

   | Changed                                                  | Update                                                                   |
   | -------------------------------------------------------- | ------------------------------------------------------------------------ |
   | How projects connect, URLs, CORS, user agent, safe areas | `knowledge/architecture.md`                                              |
   | Commands, formatting, testing rules, ports               | `knowledge/conventions.md` and the relevant `CLAUDE.md` Commands section |
   | A word people would need defined                         | `knowledge/glossary.md`                                                  |
   | Why something is the way it is                           | a new ADR via `record-decision`                                          |
   | `webapp` internals                                       | `webapp/knowledge/`                                                      |
   | `api` internals or deployment                            | `api/knowledge/`                                                         |
   | `iosapp` internals or configuration                      | `iosapp/knowledge/`                                                      |

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
