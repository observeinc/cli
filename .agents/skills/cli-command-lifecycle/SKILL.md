---
name: cli-command-lifecycle
description: >-
  Add, change, rename, or remove an observe CLI command, including GraphQL or
  REST helpers, route registration, experimental gating, docs, and unit or
  integration tests. Use for new commands, experimental commands, renames,
  deletes, and behavior changes.
metadata:
  internal: true
---

# CLI command lifecycle

Load this skill when adding, changing, renaming, or removing an `observe` CLI
command in this repository. It is the single how-to; `AGENTS.md` only points
here.

## When to load

- You are implementing or editing a command under `src/commands/`.
- You are adding or updating an experimental CLI command or route group.
- You are renaming or removing a command, group, or flag.

## Decision record

Record these keys before making code changes:

- `mode` — `add` or `change`
- `command` — CLI path (for example `dataset list`)
- `resource` — REST/GraphQL folder (for example `dataset`)
- `maturity` — `ga` or `experimental`
- `change-class` — for changes: `docs-only`, `additive`, `breaking`,
  `experimental-replace`, `rename`, or `delete`

## Reference map

- [references/add-checklist.md](references/add-checklist.md) — implement and
  register a new command through local verification.
- [references/change-checklist.md](references/change-checklist.md) — classify
  a change and complete its touch set, including rename/delete sweeps.

## Formatting

Run Prettier on the files you changed (`bunx prettier --write`), then
`bunx prettier --check` before committing.
