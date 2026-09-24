# Agents.md

Guidelines for AI agents working in this codebase.
Keep this file up to date.

## Git Workflow

When developing features or fixes in this project, always use the following skills:

- **`/branch`** — before starting any new feature or fix, use the branch skill to create a properly prefixed branch.
- **`/commit`** — when committing changes, use the commit skill to produce conventional commit messages with the correct format and scope.

## Project Overview

This is the Observe CLI (`observe`), a command-line interface for interacting with Observe Inc's observability platform.

### Tech Stack

- **Runtime**: Bun (Node.js compatible)
- **CLI Framework**: [@stricli/core](https://github.com/bloomberg/stricli) - type-safe CLI builder
- **Language**: TypeScript
- **API Communication**:
  - GraphQL (via `@graphql-codegen/cli`) for metadata queries
  - REST (via OpenAPI Generator) for data export/queries
  - Observe API requests send `User-Agent: observe-cli-ts/<version>` (legacy Go CLI uses `observe-cli/<version>`)
  - When run inside an AI agent host, a second product token is appended: `caller/<slug>` (detected via `@vercel/detect-agent`; override with standard `AI_AGENT=<slug>`)

### Project Structure

```
src/
├── app.ts              # Main application routes
├── bin.ts              # Entry point
├── context.ts          # CLI context (process, env)
├── commands/           # CLI commands organized by resource
│   ├── alert/          # Alert commands (list, view)
│   ├── apm/            # APM commands: services, environments, invocation-graph (experimental: gated + hidden)
│   ├── monitor/        # Monitor commands
│   │   └── mute/       # Monitor mute commands (list, view, create, update, delete)
│   ├── auth/           # Auth commands (configure, login, logout, status)
│   ├── cli/            # CLI management (install, uninstall, upgrade)
│   ├── content/        # Content pack management (experimental: gated + hidden)
│   │   ├── host/       # Host Explorer (install, view)
│   │   ├── kubernetes/ # Kubernetes Explorer (install, view)
│   │   └── tracing/    # Trace Explorer (install, view)
│   ├── dataset/        # Dataset commands (list, view)
│   ├── datastream/     # Datastream commands (create, list, view, update)
│   ├── docs/           # Documentation commands (search)
│   ├── ingest-token/   # Ingest token commands (experimental: gated + hidden)
│   ├── instrumentation/ # OpenTelemetry readiness: audit (CI lint, exit codes) (experimental)
│   ├── metric/         # Metric commands (list, view)
│   ├── skill/          # AI agent skill commands (list, view, install, update)
│   ├── tag/            # Tag commands (list); also aliased as `tag-key` (hidden)
│   ├── tag-value/      # Tag value commands (list)
│   ├── query.ts        # OPAL query execution
│   └── help.ts         # Help command
├── gql/                # GraphQL layer
│   ├── generated/      # Auto-generated types (DO NOT EDIT)
│   ├── authtoken/      # Auth token mutations
│   ├── content/        # Content pack queries/mutations
│   ├── dataset/        # Dataset queries
│   ├── datastream/     # Datastream queries/mutations
│   ├── ingest-token/   # Ingest token queries/mutations
│   ├── metric/         # Metric queries
│   ├── workspace/      # Workspace queries
│   ├── gql-request.ts  # GraphQL client/executor
│   └── gql-codegen.config.ts  # Codegen configuration
├── rest/               # REST API layer
│   ├── generated/      # Auto-generated client (DO NOT EDIT)
│   ├── client.ts       # REST client factory
│   └── config.yaml     # OpenAPI generator config
└── lib/                # Shared utilities
    ├── auth/           # Auth flows (browser login, device code, server discovery)
    ├── formatters/     # Output formatting (table, csv, colors, date, object, value)
    ├── config.ts       # Config loading (~/.observe/)
    ├── constants.ts    # CLI version and constants
    ├── state.ts        # CLI state management
    ├── telemetry.ts    # Usage telemetry
    ├── update-check.ts # CLI update checker
    ├── binary.ts       # Binary/executable utilities
    ├── shell.ts        # Shell command utilities
    ├── parsers.ts      # Input parsing utilities
    ├── cel.ts          # CEL expression support
    ├── writer.ts       # Output writer
    ├── stricli-wrappers.ts # defineCommand/defineRoutes (use these, not stricli's builders directly)
    ├── experimental.ts # Experimental-command feature (env gate, badge, hide)
    └── format-error.ts # Error formatting
```

### Adding a New Command

1. **Create GraphQL query** (if needed):
   - Add `src/gql/<resource>/<operation>.graphql`
   - Add `src/gql/<resource>/<operation>.ts` wrapper
   - Run `bun codegen:gql` to generate types

2. **Create command file**:
   - Add `src/commands/<resource>/<command>.ts`
   - Follow existing patterns (see `dataset/list.ts` as reference)
   - Use `defineCommand` from `lib/stricli-wrappers` (not stricli's `buildCommand` directly)

3. **Register in routes**:
   - Export from `src/commands/<resource>/index.ts`, building the route map with `defineRoutes` from `lib/stricli-wrappers` (not stricli's `buildRouteMap` directly)
   - Add to `src/app.ts` routes. New routes should be added at the bottom of the route map, but the `cli` command must always remain last.

4. **Update documentation**:
   - Update the **Project Structure** section in this `AGENTS.md` to include the new command/resource.
   - Update the **Commands** table in `README.md`. The README command order must always match the route order in `src/app.ts`.

### Adding an Experimental Command

`defineCommand`/`defineRoutes` are thin wrappers over stricli's builders that
add support for custom declarative fields; today the only field is
`experimental`. Mark a command experimental by setting it:

```typescript
export const predictCommand = defineCommand({
  experimental: true, // the only change vs a normal command
  loader: async () => predict,
  parameters: {
    /* ... */
  },
  docs: { brief: "Predict dataset usage" },
});
```

An experimental command is hidden from help and refuses to run unless
`OBSERVE_CLI_EXPERIMENTAL=1`, and shows an `[experimental]` badge when visible.
A route group becomes experimental automatically once **all** of its children
are — no annotation needed on the `defineRoutes` call. Promote to GA by deleting
the `experimental: true` line. The feature lives in `lib/experimental.ts`.

### REST-Backed List Commands

`dataset list`, `metric list`, `tag list`, and `tag-value list` are all
backed by REST endpoints:

| Command          | Endpoint                                                             |
| ---------------- | -------------------------------------------------------------------- |
| `dataset list`   | REST `/v1/datasets` (`DatasetApi.listDatasets`)                      |
| `metric list`    | REST `/v1/metrics` (`MetricsApi.listMetrics`)                        |
| `tag list`       | REST `/v1/tags` (`TagsApi.listDatasetTags`, `kind == "Correlation"`) |
| `tag-value list` | REST `/v1/tags/values` (`TagValuesApi.searchTagValues`)              |

Each command's REST helper lives in `src/rest/<resource>/list-<resource>.ts`
and stays a thin wrapper around the generated client: it accepts API
parameters (`filter`, `orderBy`, `query`, `mode`, `limit`, `offset`) and only
projects the response into the command's row shape. The command (consumer)
builds those parameters from user flags such as `--match` and
`--correlation-tag-key`/`--correlation-tag-value` using the CEL helpers in
`lib/cel.ts` (`celFuzzyContains`, `celMatchesInsensitive`,
`celHasCorrelationTag`, and `combineFilters` to AND clauses together). This CEL
layer does not replicate the JS query-util ranked-search scoring engine.
Backends are injected via each command's `deps` parameter so tests can stub
them without mutating the global environment.

### OpenTelemetry Support Manifest (`instrumentation`)

`observe instrumentation audit` (non-interactive, CI) assesses each detected application against a bundled
OpenTelemetry support manifest instead of hand-written rules. The manifest is
the single source of truth for auto-instrumentation availability, per-signal
SDK stability, runtime-version support, and per-library version compatibility.
Severity and guidance live in the CLI (`findings.ts`), not in the manifest.

- **Detection** lives in `src/lib/instrumentation/`:
  - `detectors/*.ts` — one per ecosystem (Node, Python, Java, .NET, Ruby, PHP,
    plus marker-only `native.ts` for Go/Rust/Erlang/C++/Perl). Every detector
    goes through `createCandidate` in `detectors/common.ts`. Recursive source
    inspection uses `findOwnedProjectFiles`: a nested manifest for the same
    ecosystem starts a new project boundary, while manifests and source files
    from other ecosystems do not interfere with polyglot projects. File-name
    conventions are runnable evidence only inside the owning project boundary.
    Native applications are executable targets, not arbitrary source trees.
    `discovery/bazel/` parses a bounded offline Starlark subset for C++, Go,
    Python, Java, and Rust binary rules, including conventional `*_binary`
    wrappers. It tracks nearest `MODULE.bazel`/`WORKSPACE` ownership, canonical
    labels, literal attributes, static discovery completeness, and unevaluated
    macro diagnostics. Proven `testonly = True` targets are excluded; names are
    not used to guess whether a target is a test. CMake `add_executable`, Cargo
    bins, and Go `package main` commands use the same discovery provenance model.
  - `graph/` — normalized rooted dependency graphs. `uv.lock` and pnpm workspace
    providers preserve transitive, optional, peer, and development edges;
    traversal excludes development/test/build edges and retains shortest runtime
    paths plus immediate parents. npm uses Arborist's virtual lockfile tree in the
    audit command. CycloneDX JSON is accepted through `--sbom`; `--resolve`
    explicitly enables locked, offline Cargo, Go, and Maven metadata commands.
    Every graph reports `resolved-graph`, `partial-graph`, or `inventory-only`
    completeness and records provider/path provenance.
  - `lockfiles.ts` — inventory fallback for ecosystems without a graph provider.
    A resolved version sets `resolvedVersion` + `sourceKind: "lockfile"` and wins
    over the manifest range. An unparseable lockfile raises
    `LOCKFILE_UNPARSEABLE` and falls back to declared ranges.
  - `runtime-version.ts` — runtime version from `.nvmrc`, `.ruby-version`,
    `.python-version`, `.tool-versions`, `runtime.txt`, or a Dockerfile `FROM`
    tag when the manifest declares none. Manifest wins, then version file, then
    Dockerfile. Recorded as `Evidence { kind: "runtime-version" }`.
  - `findings.ts` — rule table `OTEL001..OTEL030` and `deriveFindings()`. Rule
    IDs are stable (never renumber); severities are policy and may change.
    OTEL011 and OTEL014 are retired; never reuse their IDs.
  - `formats/sarif.ts`, `formats/github.ts` — SARIF 2.1.0 and GitHub workflow
    command output for `audit --format`.
- **Runtime layer** lives in `src/lib/instrumentation/manifest/`:
  - `schema.ts` — manifest v1/v2 types + strict zod validator (unknown keys fail).
    V2 supports multiple native/external options with independent ranges,
    activation metadata, and prerequisites. Do not mix scalar fields and options.
  - `otel-support-manifest.yaml` — the committed, hand-maintained data file (Bun
    inlines the YAML import at build; validated by zod at load). Missing
    `supportedVersions` means unknown, never wildcard support.
  - `load.ts` — `loadManifest()`, `manifestInfo()` (schemaVersion, generatedAt,
    sha256, origin) which every result carries, and `setManifestOverride()` for
    `audit --manifest <file>` and tests. No network I/O.
  - `version-grammar.ts` — per-ecosystem version matching. The declared spec is
    expanded to the full range it admits and compared as a set:
    `in-range` (subset), `overlap` (partial), `out-of-range` (disjoint),
    `unknown` (unparseable). `normalizeRuntimeVersion()` handles .NET TFMs,
    legacy Java `1.x`, and version-file prefixes.
  - `check.ts` / `profile.ts` — `checkCompatibility()` → `CompatibilityProfile`
    with `packages.supported` / `unsupported` (with `reason`) / `unverified`.
    `unknown` is never filed as supported. Explicit catalog options are evaluated
    even for SDK-only runtimes and dependencies classified as `other`. Known
    option ranges form a union, preserving gaps and per-option setup requirements.
    Result schema v6 reports normalized options and activation as not assessed.
    Support is not proof of enablement or telemetry delivery; opt-in is not a failure.
- **`audit` exit codes**: 0 completed analysis below `--fail-on` (default
  `error`), 1 findings at the threshold, 2 tool error: unreadable path or
  manifest, project-level error diagnostic (incomplete scan, unreadable
  metadata), or no candidates. `--fail-on none` cannot suppress tool errors.
  A candidate's own error diagnostics become OTEL030 findings so one broken
  application never hides the verdicts for the rest of a monorepo.
- **Scanning** (`snapshot.ts`): hidden directories and `IGNORED_DIRECTORIES`
  are skipped; `--exclude` adds root-relative directories. Metadata files are
  read during the walk; other text files are read lazily on first `content`
  access. Per-candidate path lookups go through `file-index.ts` (memoized per
  file array) and shared lockfiles are parsed once via `parseSnapshotFile`;
  never add a linear `snapshot.files` scan inside a per-candidate loop.
- **Maintenance**: edit `otel-support-manifest.yaml` by hand to add or update
  runtimes and packages. There are no offline generation scripts, no evidence
  file, and no provenance/citation tracking. The schema (zod) validates shape at
  load; `bun run test:otel-manifest` validates ranges and invariants offline. Do
  not add hardcoded library lists or language-specific source parsers to the
  runtime. AI-assisted maintenance uses
  `.agents/skills/maintain-otel-manifest/SKILL.md` in the current session.
  Uncataloged libraries are left unassessed (no per-library finding); the
  catalog is the sole authority on what can be assessed. Unknown upstream ranges
  for a cataloged library produce `OTEL015`, distinct from unknown application
  versions. `OTEL014` (catalog miss) is retired; never reuse the ID.
- **Review**: PR CI runs credential-free deterministic checks (typecheck, lint,
  format, `bun test src`). Optional Bugbot guidance is in `.cursor/BUGBOT.md`;
  installation and failing-check behavior require repository configuration. No
  auto-merge or autofix.

### Command Pattern

Commands follow this structure:

```typescript
import { defineCommand } from "../../lib/stricli-wrappers";
import type { LocalContext } from "../../context";

interface CommandFlags {
  // flag definitions
}

async function commandFn(
  this: LocalContext,
  flags: CommandFlags,
): Promise<void> {
  const { process } = this;
  const config = loadConfig();
  // implementation
}

export const myCommand = defineCommand({
  loader: async () => commandFn,
  parameters: {
    flags: {
      /* flag definitions */
    },
    aliases: {
      /* short aliases */
    },
  },
  docs: { brief: "Description" },
});
```

### GraphQL Pattern

1. Define query in `.graphql` file
2. Create TypeScript wrapper that:
   - Imports generated types from `../generated/graphql`
   - Uses `executeGraphQL()` from `../gql-request`
   - Exports typed result interfaces

### TypeScript Type Conventions

**Use object parameters for functions with multiple arguments**: When a function takes more than one argument, use an object parameter instead of positional arguments.

```typescript
// ✅ Good - object parameter
async function performLogin({
  serverUrl,
  port,
  onSuccess,
}: {
  serverUrl: string;
  port: number;
  onSuccess: () => void;
}) {
  // ...
}

// ❌ Avoid - multiple positional arguments
async function performLogin(
  serverUrl: string,
  port: number,
  onSuccess: () => void,
) {
  // ...
}
```

**Use inline types for object parameters**: Define types inline in the function signature. Only create separate interfaces/types when they need to be exported or reused elsewhere.

```typescript
// ✅ Good - inline type definition
async function fetchServers({
  accountServerUrl,
  port = 8085,
}: {
  accountServerUrl: string;
  port?: number;
}) {
  // ...
}

// ❌ Avoid - unnecessary separate interface
interface FetchServersOptions {
  accountServerUrl: string;
  port?: number;
}

async function fetchServers({
  accountServerUrl,
  port = 8085,
}: FetchServersOptions) {
  // ...
}
```

**Prefer inferred return types**: Let TypeScript infer return types. Explicit return types are only needed when:

- The inference would be incorrect or too wide
- You're defining a public API that needs documentation
- The function is recursive

```typescript
// ✅ Good - let TypeScript infer the return type
async function fetchDatasets(config: Config) {
  const response = await executeGraphQL(...);
  return response.data.datasets;
}

// ❌ Avoid - unnecessary explicit return type
async function fetchDatasets(config: Config): Promise<Dataset[]> {
  // ...
}
```

**Use generated types directly**: When working with GraphQL or REST codegen, import and use the generated types directly. Do NOT recreate similar type definitions manually.

```typescript
// ✅ Good - use generated types directly
import type { DatasetFieldsFragment, MetricSearchQuery } from "../generated/graphql";

function processDataset(dataset: DatasetFieldsFragment) { ... }

// ❌ Avoid - recreating types that already exist in generated code
interface Dataset {
  id: string;
  name: string;
  // ...duplicating what's already generated
}
```

**Extracting nested types**: Use TypeScript utility types to extract nested types from generated queries rather than defining new interfaces:

```typescript
// ✅ Good - extract type from generated query
type MetricMatch = MetricSearchQuery["metricSearch"]["matches"][number];

// ❌ Avoid - manually defining what's already in generated types
interface MetricMatch {
  metric: { name: string; ... };
}
```

### Metric-Specific Patterns

**Important**: Metrics don't have a direct "get by ID" query. Use `metricSearch` with exact name matching:

```typescript
// In get-metric.ts
const match =
  response.data.metricSearch.matches.find(
    (m) => m.metric.name === name || m.metric.nameWithPath === name,
  ) ?? null;
```

**Heuristics**: When requesting metric heuristics, you MUST specify `globalLimit`:

```typescript
heuristicsOptions: {
  inclusionOption: "Everything",
  globalLimit: "100",  // Required!
}
```

**Tags**: The `MetricTagPath` type has `column` and `path` fields directly (not nested). When defining column types for tags table, use a simple interface:

```typescript
interface MetricTag {
  column: string;
  path: string;
}
const tagColumns: ColumnDef<MetricTag>[] = [...]
```

### Output Formatting

- Use `formatTable()` from `lib/formatters/table` for tabular output
- Support `--format json|csv` flags for machine-readable output
- Use `chalk` for colored terminal output

### Configuration

User credentials stored in `~/.observe/config.json`:

- `customerId`: Observe customer ID
- `token`: API token (managed via `auth login` or `auth configure`)
- `domain`: API domain
- `tokenId`: Token identifier (optional)
- `apiUrl`: API URL override (optional)

### Running Commands

```bash
# Development
bun run src/bin.ts <command>

# Examples
bun run src/bin.ts auth login
bun run src/bin.ts auth status
bun run src/bin.ts dataset list --match "logs"
bun run src/bin.ts dataset view <dataset-id>
bun run src/bin.ts datastream list
bun run src/bin.ts datastream create --name "my-stream"
bun run src/bin.ts ingest-token list
bun run src/bin.ts metric list --match "cpu"
bun run src/bin.ts metric view CPUUtilization
bun run src/bin.ts alert list
bun run src/bin.ts skill list
bun run src/bin.ts content host install
bun run src/bin.ts content kubernetes install
bun run src/bin.ts tag list --match "host"
bun run src/bin.ts tag-value list --match "checkout"
bun run src/bin.ts docs search "how do I create a monitor"
bun run src/bin.ts query --input <dataset-id> --pipeline "limit 10"
```

### Code Generation

```bash
# GraphQL types (requires OBSERVE_GQL_TOKEN in .env)
bun codegen:gql

# REST client
bun codegen:rest

# Both
bun codegen
```
