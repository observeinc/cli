# Eval routes for CLI command lifecycle

Coverage, local Linux Harbor, iteration, and the scoped CI trailer after a
CLI command add or change. Load `ai-eval-landscape` for suite routing and
interpretation; do not restate its matrix.

## Coverage

From `code/js/packages/ai`:

```bash
pnpm eval:corpus -- ls --op <op_id> --count
pnpm eval:corpus -- ls --op <op_id> --provenance hand
```

Use `pnpm eval:coverage -- --tool <name>` only when the op also has an MCP
or internal identity. `pnpm eval:coverage` has no `--cli` flag.

Do not treat `make evals-run-all SURFACE=observe-cli` as the lifecycle
how-to. That target is a whole-surface run, allowed only after coverage
when no single scenario id is known.

## Three tokens

| Token                      | Role                                                  |
| -------------------------- | ----------------------------------------------------- |
| `observe-cli`              | Local Harbor surface                                  |
| `cli`                      | Jenkins `--components` value                          |
| `observe-monorepo-src-cli` | CI trial image used by `s/integration/test-ai-cli.sh` |

`--components observe-cli` is a defect.

## Ops registry and stems

Update `operations.py` in `observeinc/external-evals`. Its path is unknown
until that repo is readable. Then, from
`code/js/webapp/src/server/ai-api/ai/mcp/evals`, run:

```bash
make registry
make registry-check
```

Authors do not hand-edit
`code/js/packages/ai/src/eval/scripts/registry.json`.

Until the framework change is installed, a stem may use
`custom_operations` with `cli: [observe, …]`. `cli: null` requires
`cli_null_reason`. Drop `custom_operations` for an id that already exists
in `registry.json`.

## When a stem must change

Edit stems when any of these apply:

- Shared op: the registry op also has a non-null `mcp` and/or non-empty
  `internal[]`, or an existing stem names that op.
- New user-visible behavior that evals should grade.
- Rename or delete.
- Closing a `cli: null` gap.

Docs-only with no behavior claim skips stems. Do not add
`representative-sample` just to filter. Stem `surfaces` uses `cli`, not
`observe-cli`. Omit `surfaces` when Harbor can derive them.

## Linux build

From `~/cli`, call the build script directly when generated sources
already exist (`bun run build` runs codegen first):

```bash
bun run scripts/build.ts --target linux-x64
```

That produces `dist-bin/observe-linux-x64`. Use `linux-arm64` only when
the trial image is arm64.

## Local opt-in

Public variable `OBSERVE_CLI_BIN` is the absolute path of that Linux
binary. Unset or empty keeps the released bake and does not add a mount.
A non-empty value is mounted read-only over the executable the trial
runs.

Working assumption (confirm-when-external-evals-is-readable): overlay
path is `/usr/local/bin/observe`. Do not invent other Harbor files
inside `observeinc/external-evals`.

`doctor` rejects a missing path, a non-executable file, and a binary
whose architecture does not match the trial image. Surface names stay
`observe-cli` or `observe-monorepo-src-cli`. Do not select an
`observe-cli-local` surface.

If `observeinc/external-evals` is not readable, run on the released bake,
record the blocker, and do not report the run as validating the new
binary.

## Harbor

From `code/js/webapp/src/server/ai-api/ai/mcp/evals`.

Prerequisites: Docker, `observe-external-evals` (`make evals-install`),
and eval credentials.

```bash
make tasks
make validate
make evals-run EVAL=<group>/<scenario_id> ARGS="--surface observe-cli --n-attempts 3"
```

`evals-run` does not read a `SURFACE=` make variable, so the surface
flag belongs in `ARGS`. `make evals-run-all SURFACE=observe-cli` is a
whole-surface run, allowed only after coverage when no single scenario
id is known.

Leave `HARBOR_JUDGE_MODEL` unset. `tasks/` is generated and gitignored.
Do not hand-edit it.

## Iteration

Record the baseline, make one focused fix, rerun the same scoped
command, and keep or revert. `iterations` must be at least 1 before a
CI trailer. Required even when the first run is green.

## CI trailer

After local green, emit exactly:

```
jenkins: evaluate-observe-ai --scenario-ids <scenario-id> --components cli --trials 3
```

Multiple ids are comma-separated. CI runs `s/integration/test-ai-cli.sh`
on baked `observe-monorepo-src-cli` and does not set `OBSERVE_CLI_BIN`.

Do not emit a bare `jenkins: evaluate-observe-ai` or `--full-eval` as
the default. Do not emit `jenkins: o11y-agent-eval` for a
CLI-command-only change.

If no scenario id exists, omit the trailer and record
`CLI Jenkins scoped line omitted — no scenario id; local Harbor ran or was blocked.`

## Blocked run

If Docker, the external-evals install, the opt-in, or credentials block
the live run, write the blocker and the commands that were ready. A
skipped live run is not a pass.
