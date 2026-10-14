---
name: cli-command-lifecycle
description: >-
  Add or change an observe CLI command, including ops and eval updates, a local
  Harbor loop against an unreleased Linux binary, and the scoped CI trailer.
  Use for new commands, experimental commands, renames, deletes, and behavior
  changes—not MCP tools or skill authoring.
metadata:
  internal: true
---

# CLI command lifecycle

Load this skill when adding, changing, renaming, or removing an `observe` CLI
command in `~/cli`. It is the single how-to; `AGENTS.md` only points here.
Send MCP or AI-SRE tool work to `tool-lifecycle` and skill packaging to
`create-observe-skill`.

## When to load

- You are implementing or editing a command under `src/commands/`.
- You need ops registry, Harbor, or CI steps after local `~/cli` is green.
- An orchestrator handoff names a CLI command change.

## Decision record (before evals)

Record these keys before any eval or expectation work:

- `mode` — `add` or `change`
- `command` — CLI path (for example `dataset list`)
- `resource` — REST/GraphQL folder (for example `dataset`)
- `maturity` — `ga` or `experimental`
- `change-class` — for changes: docs-only, additive, breaking,
  experimental-replace, rename, or delete
- `grading-criteria` — how evals or reviewers judge success
- `iterations` — Harbor reruns after a fix (at least 1 before CI)

When a handoff is present, consume it instead of re-asking.

## Reference map

- [references/add-checklist.md](references/add-checklist.md) — implement and
  register a new command through local green in `~/cli`.
- [references/change-checklist.md](references/change-checklist.md) — classify
  a change and complete its touch set, including rename/delete sweeps.
- [references/eval-routes.md](references/eval-routes.md) — command source of
  truth for coverage, Linux build, Harbor on `observe-cli`, iteration, and
  the scoped Jenkins trailer (CI uses the baked CLI, not your local binary).
- [references/docs-delta.md](references/docs-delta.md) — pending Notion
  checklist for Overview and Running MCP/CLI evals; not a second procedure.

## Formatting

Run Prettier on the files you changed (`bunx prettier --write`), then
`bunx prettier --check` before committing.

## Not the how-to

`make evals-run-all SURFACE=observe-cli` is a whole-surface run after
coverage when no single scenario id is known. It is **not** the add/change
lifecycle how-to; follow [references/eval-routes.md](references/eval-routes.md)
for scoped Harbor commands instead.
