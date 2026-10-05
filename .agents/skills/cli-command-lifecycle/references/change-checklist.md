# Change, Rename, and Delete Checklist

Use this checklist when altering an existing CLI command, group, flag, or
output. Before changing code, classify the change and complete its touch set.

## Change classes

| Change class           | Definition                                                    | Required touch set                                                                                                                                                                                      |
| ---------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs-only`            | Brief or help text with no behavior claim.                    | Update the applicable help text, README, or `AGENTS.md`; skip expectations.                                                                                                                             |
| `additive`             | New optional flag or field; old invocations remain unchanged. | Update the command file, resource `index.ts` if its routes change, help text, unit tests, README and `AGENTS.md` where users discover it, and expectations only when a stem asserts the new capability. |
| `breaking`             | Changed default, removed flag, or changed output shape.       | Update the command file, resource `index.ts` if needed, help text, unit and integration tests, README, `AGENTS.md`, and expectations.                                                                   |
| `experimental-replace` | A gated replacement for GA behavior.                          | Update the command file, experimental route or gate, help text, unit and integration tests, README, `AGENTS.md`, and expectations behind the gate.                                                      |
| `rename`               | Command, group, or flag renamed.                              | Update the new implementation and complete the rename/delete sweep, preserving a hidden alias until usage dies off; update expectations.                                                                |
| `delete`               | Command or group removed.                                     | Remove its implementation and complete the rename/delete sweep; update expectations.                                                                                                                    |

## Flags superseded by additive changes

When a new flag supersedes an existing one, preserve the old flag as optional
and hidden:

- Keep the old flag as `optional: true, hidden: true`.
- Give it the brief `Deprecated alias for --<new>`.
- Resolve the effective value as `flags.<new> ?? flags.<old>` so the new flag
  wins if both are supplied.

Follow the deprecated `--label` alias for `--match` in
`src/commands/dataset/list.ts`.

## Command and group renames

Keep the old key in `src/app.ts` pointing to the same route object, then add
that key to `docs.hideRoute`. Drop the alias once usage dies off. Follow the
`tag-key` alias precedent in `src/app.ts`.

## Rename/delete sweep

For a rename or deletion, search and update every location that can retain the
old name:

1. The command file.
2. The resource `index.ts`.
3. `src/app.ts` routes and `docs.hideRoute`.
4. The README Commands table.
5. The `AGENTS.md` Project Structure tree and REST-Backed List Commands
   table.
6. Unit tests under `src/commands/<resource>/`.
7. Integration tests under `integration/`.
8. `operations.py`.
9. Monorepo `scenario.yaml` stems that name the command.
10. The committed operation registry: run `make registry`, then
    `make registry-check`, from
    `code/js/webapp/src/server/ai-api/ai/mcp/evals`.

Clean operation-registry entries and scenario stems in the same change. A stem
that names a removed command fails `make validate`.

## Expectations

`docs-only` changes with no behavior claim skip expectation updates. Every
other change class must use
[evaluation routes](eval-routes.md) to find coverage and update expectations
before running them.

## Finish

Run `bunx prettier --write` on this file, then `bunx prettier --check` on this
file before committing.
