# Add a command checklist

End-to-end steps to add a new `observe` CLI command.

## Before you start

Record a decision with these keys:

- `mode=add`
- `command` — CLI path (for example `dataset list`)
- `resource` — REST/GraphQL resource folder name (for example `dataset`)
- `maturity` — `ga` or `experimental`

## API layer, only when needed

Skip this section when the command reuses an existing backend helper.

**GraphQL**

1. Add `src/gql/<resource>/<operation>.graphql`.
2. Add a thin `.ts` wrapper that calls `executeGraphQL()` from
   `src/gql/gql-request.ts`.
3. Run `bun codegen:gql`.

**REST**

1. Add `src/rest/<resource>/<verb>-<resource>.ts` — accept API parameters and
   project the response shape the command needs. Export from
   `src/rest/<resource>/index.ts` when the resource barrel is new or extended.

Never hand-edit generated trees: `src/gql/generated/` and
`src/rest/generated/`.

## Command file

Create `src/commands/<resource>/<command>.ts`.

- Import `defineCommand` from `src/lib/stricli-wrappers` (not stricli
  `buildCommand`).
- Type flags with a local interface on the command module.
- Inject backends through an optional `deps` object on the handler. Tests stub
  through `deps` because `mock.module` is process-global in bun and leaks
  across test files (see `src/commands/dataset/list.ts`).
- List commands with filter flags: build CEL in `src/lib/cel.ts` and parse user
  input with helpers in `src/lib/parsers.ts` (pattern: `dataset list`).
- Set `docs.brief` to an imperative one-liner.
- Row/list commands: support `--format json|csv` and the `--json` shorthand.
- Tabular output: `formatTable()` from `src/lib/formatters/table`.
- Structured output: wrap the context writer with `muteStatusWriter()` from
  `src/lib/writer`, with
  `muted: format === "json" || format === "csv"`. Status `info`/`warn`/`success`
  still go to stdout and would corrupt a JSON or CSV payload; the docstring in
  `src/lib/writer.ts` documents this helper for `--format json|csv`. Pattern:
  `src/commands/dataset/list.ts`.
- CSV body: `renderAsCSV()` from `src/lib/formatters/csv` (same reference
  command).
- Errors: `formatApiError` and set `process.exitCode = 1`.

## Route registration

1. Export the command (or sub-route map) from `src/commands/<resource>/index.ts`
   using `defineRoutes` (not stricli `buildRouteMap`).
2. Register the group on the top-level map in `src/app.ts`.

Order rules (keep all three):

- New routes go at the **bottom** of the route map in `src/app.ts`.
- The `cli` route must **always remain last**.
- The README **Commands** table order must match the route order in
  `src/app.ts`.

Hidden back-compat alias precedent: `tag-key` in `src/app.ts` points at the
same handlers as `tag` and is listed under `docs.hideRoute` so old scripts keep
working without appearing in help.

## Experimental gating

When `maturity` is `experimental`, set `experimental: true` on `defineCommand`
and nothing else. The command is hidden and refuses to run unless
`OBSERVE_CLI_EXPERIMENTAL=1`, and shows an `[experimental]` badge when visible.
A route group becomes experimental when every child command is experimental
(`isAllExperimental` also treats nested route maps the same way). Promote to GA
by deleting that one line.

Behavior lives in `src/lib/experimental.ts`. Authors do not import it
directly — `defineCommand` / `defineRoutes` in `src/lib/stricli-wrappers`
apply the gate.

## Docs

- Update the Project Structure tree in `AGENTS.md`.
- Update the Commands table in `README.md` for GA commands only. Experimental
  commands stay out of the README Commands table; the README **Experimental
  commands** section already documents the gate.

## Tests

Add `src/commands/<resource>/<command>.test.ts` with `bun:test`, stubbing
backends through `deps` (pattern: `src/commands/dataset/list.test.ts`).

Cover at minimum:

- Happy path
- Empty-result user message
- `--format json`. Optionally add a test for the `--json` shorthand; do not
  treat `--json` as a substitute for `--format json` coverage.
- Each flag-validation error your command defines

## Local verification

```bash
export PATH="$HOME/.bun/bin:$PATH"
```

When generated sources already exist in the tree:

```bash
bun run typecheck
bun run lint
bun run format
bun test src/commands/<resource>
```

`bun run format` is check-only; `bun run format:fix` writes. `bun run test`
also runs codegen and needs `OBSERVE_GQL_TOKEN` and
`OBSERVE_OPENAPI_SPEC`. If those env vars are missing, say so explicitly — do
not treat a codegen failure as a failure of your command work.
