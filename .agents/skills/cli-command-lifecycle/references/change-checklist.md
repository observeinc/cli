# Change, Rename, and Delete Checklist

Use this checklist when altering an existing CLI command, group, flag, or
output. Before changing code, classify the change and complete its touch set.

## Change classes

| Change class           | Definition                                                    | Required touch set                                                                                                                   |
| ---------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `docs-only`            | Brief or help text with no behavior claim.                    | Update the applicable help text, README, or `AGENTS.md`.                                                                             |
| `additive`             | New optional flag or field; old invocations remain unchanged. | Update the command file, resource `index.ts` if its routes change, help text, unit tests, and README and `AGENTS.md` where needed.   |
| `breaking`             | Changed default, removed flag, or changed output shape.       | Update the command file, resource `index.ts` if needed, help text, unit and integration tests, README, and `AGENTS.md`.              |
| `experimental-replace` | A gated replacement for GA behavior.                          | Update the command file, experimental route or gate, help text, unit and integration tests, README, and `AGENTS.md` behind the gate. |
| `rename`               | Command, group, or flag renamed.                              | Update the new implementation and complete the rename/delete sweep, preserving a hidden alias until usage dies off.                  |
| `delete`               | Command or group removed.                                     | Remove its implementation and complete the rename/delete sweep.                                                                      |

## Deprecated flag aliases

When a new flag supersedes an existing one, preserve the old flag as optional
and hidden:

- Keep the old flag as `optional: true, hidden: true`.
- Give it the brief `Deprecated alias for --<new>`.
- Resolve the effective value as `flags.<new> ?? flags.<old>` so the new flag
  wins if both are supplied.

Follow the deprecated `--label` alias for `--match` in
`src/commands/dataset/list.ts`.

## Command and group renames

For a renamed flag, follow [Deprecated flag aliases](#deprecated-flag-aliases)
above.

Keep the old key pointing to the same route or command object in the route map
that owns the renamed key (`src/app.ts` for top-level groups, or
`src/commands/<resource>/index.ts` for subcommands), then add that key to the
owning route map's `docs.hideRoute`. Drop the alias once usage dies off. Follow
the `tag-key` alias precedent in `src/app.ts`.

## Rename/delete sweep

For a rename or deletion, search and update every location that can retain the
old name:

1. The command file.
2. The resource `index.ts` routes and `docs.hideRoute`.
3. `src/app.ts` routes and `docs.hideRoute`.
4. The README Commands table (order matches `src/app.ts`; hidden alias keys
   such as `tag-key` stay out of the table).
5. The `AGENTS.md` Project Structure tree and REST-Backed List Commands
   table.
6. Unit tests under `src/commands/<resource>/`.
7. Integration tests under `integration/`.

## Finish

Run `bunx prettier --write` on the files you changed, then `bunx prettier
--check` before committing.
