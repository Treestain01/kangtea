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
