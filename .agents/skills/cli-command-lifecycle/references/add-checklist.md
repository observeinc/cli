# Add a command checklist

End-to-end steps to add a new `observe` CLI command in `~/cli`. Ops registry,
Harbor evals, and CI continue in `references/eval-routes.md`. This checklist
ends at a green local `~/cli`.

## Before you start

Record a decision with these keys:

- `mode=add`
- `command` — CLI path (for example `dataset list`)
- `resource` — REST/GraphQL resource folder name (for example `dataset`)
- `maturity` — `ga` or `experimental`
- `grading-criteria` — how evals or reviewers judge success

When an orchestrator handoff is present, consume it instead of re-asking. When
working standalone, ask for the use case and grading success criteria before
any eval or expectation work (even if you defer evals until after local green).

## API layer, only when needed

Skip this section when the command reuses an existing backend helper.

**GraphQL**

1. Add `src/gql/<resource>/<operation>.graphql`.
2. Add a thin `.ts` wrapper that calls `executeGraphQL()` from
   `src/gql/gql-request.ts`.
3. Run `bun codegen:gql`.

**REST**

1. Add `src/rest/<resource>/<verb>-<resource>.ts` — accept API parameters and
   project the response shape the command needs.

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
- Set `docs.brief` to an imperative one-liner.
- Row/list commands: support `--format json|csv` and the `--json` shorthand.
- Tabular output: `formatTable()` from `src/lib/formatters/table`.
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
A route group becomes experimental when every child command is experimental.
Promote to GA by deleting that one line.

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

`bun run test` also runs codegen and needs `OBSERVE_GQL_TOKEN` and
`OBSERVE_OPENAPI_SPEC`. If those env vars are missing, say so explicitly — do
not treat a codegen failure as a failure of your command work.

## Handoff

Ops registry updates, CLI-surface task generation, Harbor trials, and CI
trailer work continue in `references/eval-routes.md`. Stop here once local
`~/cli` is green.
