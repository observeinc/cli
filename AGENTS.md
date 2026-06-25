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
│   ├── auth/           # Auth commands (configure, login, logout, status)
│   ├── cli/            # CLI management (install, uninstall, upgrade)
│   ├── content/        # Content pack management (experimental: gated + hidden)
│   │   ├── host/       # Host Explorer (install, view)
│   │   ├── kubernetes/ # Kubernetes Explorer (install, view)
│   │   └── tracing/    # Trace Explorer (install, view)
│   ├── dataset/        # Dataset commands (list, view)
│   ├── datastream/     # Datastream commands (create, list, view, update)
│   ├── ingest-token/   # Ingest token commands (experimental: gated + hidden)
│   ├── metric/         # Metric commands (list, view)
│   ├── skill/          # AI agent skill commands (list, view)
│   ├── tag-key/        # Tag key commands (list)
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
    ├── kg-search.ts    # Knowledge graph search
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
bun run src/bin.ts tag-key list --match "host"
bun run src/bin.ts tag-value list --key "host"
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
