# Notion docs-delta checklist

Status: pending (Notion credentials were not used)

Out of scope: full eval-docs cleanup is OB-64633.

The monorepo `ai-eval-landscape` pointer is a separate observe brief and is
not edited from this file.

## Overview page

- [ ] **pending** — Adding, changing, renaming, or removing an `observe` CLI
      command is guided by the skill at
      `~/cli/.agents/skills/cli-command-lifecycle/`. Remove any second
      add-command recipe from Overview; it must not duplicate that skill.

- [ ] **pending** — Local Harbor may inject an unreleased Linux `observe`
      binary via the `OBSERVE_CLI_BIN` environment variable. Default local
      runs and all CI runs keep the released bake / `monorepo-src-cli`;
      `OBSERVE_CLI_BIN` is an opt-in override only.

- [ ] **pending** — Delete or rewrite any sentence that says to run
      `make evals-run-all SURFACE=observe-cli` as the way to land a command.
      That invocation is not the add/change lifecycle default.

## Running MCP/CLI evals page

URL: <https://app.notion.com/p/observeinc/Running-MCP-CLI-evals-3bb770a806fc812fa95ddbc13a288821>

- [ ] **pending** — Build `dist-bin/observe-linux-x64` with
      `bun run scripts/build.ts --target linux-x64` (`linux-arm64` only when
      the trial image is arm64). Set `OBSERVE_CLI_BIN` to that absolute path.
      From `code/js/webapp/src/server/ai-api/ai/mcp/evals`, run `make tasks`,
      `make validate`, then
      `make evals-run EVAL=<group>/<scenario_id> ARGS="--surface observe-cli --n-attempts 3"`.
      Iterate at least once. Prerequisites: Docker, `observe-external-evals`,
      eval credentials. A blocked live run is recorded, not marked green.

- [ ] **pending** — Update `operations.py` in `observeinc/external-evals`
      (path unknown until that repo is readable). Refresh with `make registry`
      and `make registry-check`. Edit scenario stems for a shared op, a
      rename/delete, or new graded behavior. Docs-only changes with no
      behavior claim skip stems.

- [ ] **pending** — After local green, the commit-message trailer is
      `jenkins: evaluate-observe-ai --scenario-ids <scenario-id> --components cli --trials 3`.
      CI uses baked `observe-monorepo-src-cli`
      (`s/integration/test-ai-cli.sh`), not the local binary. Do not document
      a bare `jenkins: evaluate-observe-ai` or `--full-eval` as the
      command-lifecycle default.

- [ ] **pending** — Apply these two Notion pages only if credentials work.
      Credentials were not available for this brief; every row above stays
      pending. This checklist is the deliverable.
