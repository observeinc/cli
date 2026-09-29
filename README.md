# Observe CLI

Command line interface for [Observe Inc](https://www.observeinc.com).

## Features

- **Tag Search** - Resolve entities and entity types via tag keys and tag values to ground investigations in real data.
- **Dataset Management** - List, view, and explore datasets with filtering and field selection.
- **Metric Exploration** - Search, list, and inspect metrics including type, unit, and available dimensions.
- **OPAL Query Execution** - Run OPAL queries directly from your terminal with schema-aware table output.
- **AI Agent Skills** - List and view reusable AI-agent instruction documents stored in Observe.
- **Alert Monitoring** - List and view alerts with severity filtering and active-only views.
- **Monitor Mutes** - Full CRUD for monitor mute rules (snoozes), targeting all monitors or a specific set.
- **Datastream Management** - Create, list, view, and update datastreams.
- **Documentation Search** - Semantic search across Observe's built-in documentation from your terminal.
- **Multiple Output Formats** - All commands support `--format json` and `--format csv` for scripting and pipelines.
- **Responsive Tables** - Terminal-aware column widths with automatic text wrapping.

## Installation

Install the CLI:

```bash
curl -fsSL https://raw.githubusercontent.com/observeinc/cli/main/install.sh | bash
```

Install the Observe agent skills into your coding agents:

```bash
observe skill install --all
```

## Commands

| Command                                 | Description                                             |
| --------------------------------------- | ------------------------------------------------------- |
| `observe help`                          | Show help information                                   |
| `observe auth login`                    | Authenticate with Observe (browser or device code flow) |
| `observe auth logout`                   | Clear stored credentials                                |
| `observe auth status`                   | Show current authentication status                      |
| `observe auth configure`                | Manually configure CLI credentials                      |
| `observe auth profile list`             | List all saved profiles                                 |
| `observe auth profile use`              | Switch the default profile                              |
| `observe tag-value list`                | Search tag values                                       |
| `observe tag list`                      | Search tags                                             |
| `observe dataset list`                  | List datasets with optional filtering                   |
| `observe dataset view`                  | View dataset details and schema                         |
| `observe metric list`                   | Search and list metrics                                 |
| `observe metric view`                   | View metric details and dimensions                      |
| `observe query`                         | Execute OPAL queries on datasets                        |
| `observe skill list`                    | List AI agent skills                                    |
| `observe skill view`                    | View skill details and content                          |
| `observe skill install`                 | Install skills into your coding agents                  |
| `observe skill update`                  | Update installed skills to the latest version           |
| `observe alert list`                    | List alerts with severity and status filtering          |
| `observe alert view`                    | View full alert details                                 |
| `observe monitor mute list`             | List and search monitor mute rules                      |
| `observe monitor mute view`             | View full monitor mute rule details                     |
| `observe monitor mute create`           | Create a monitor mute rule                              |
| `observe monitor mute update`           | Update a monitor mute rule                              |
| `observe monitor mute delete`           | Delete a monitor mute rule                              |
| `observe datastream create`             | Create a new datastream                                 |
| `observe datastream list`               | List datastreams                                        |
| `observe datastream view`               | View a datastream by ID                                 |
| `observe datastream update`             | Update a datastream                                     |
| `observe datastream-token check-status` | Poll a datastream token until ingest data arrives       |
| `observe docs search`                   | Search Observe's documentation                          |
| `observe cli install`                   | Configure shell integration (PATH, completions)         |
| `observe cli uninstall`                 | Remove shell integration                                |
| `observe cli upgrade`                   | Upgrade to the latest version                           |

### Experimental commands

Experimental commands are hidden by default and gated behind an environment
variable. They are **not** covered by SemVer — their names, flags, and output
may change or be removed without notice.

```bash
# Enable experimental commands for the session
export OBSERVE_CLI_EXPERIMENTAL=1
observe help            # experimental commands now appear, tagged [experimental]
```

Assess a project's OpenTelemetry instrumentation compatibility:

```bash
observe instrumentation audit .
observe instrumentation audit . --format json
```

The check is read-only and offline: it evaluates the project against a bundled
OpenTelemetry support manifest and reports zero-code instrumentation
availability, per-signal SDK stability, runtime-version support, and per-library
compatibility. Nothing is installed, changed, or sent.

Support can come from external adapters or instrumentation built into libraries.
The checker combines known version coverage in the existing library table.
Activation details and setup prerequisites remain in JSON, not the table output.
Opt-in support still counts as available support. The check does not determine
whether tracing is enabled or telemetry is delivered. JSON result schema v6 replaces scalar instrumentation metadata with
`instrumentationOptions` and reports `activationAssessment: "not-assessed"` for
cataloged libraries. Older scalar catalog entries retain unknown activation metadata.

For CI, use `observe instrumentation audit . --format json --fail-on warning`.
Exit codes are 0 for a completed audit below the findings threshold, 1 for
findings at or above it, and 2 for a tool error: an unreadable path or
manifest, an incomplete scan, or no detected applications. `--fail-on none`
does not suppress tool errors. A problem confined to one application, such as
conflicting lockfiles, is reported as an OTEL030 finding for that application
and the rest of the project is still assessed. Runtimes that have an
OpenTelemetry SDK but no zero-code instrumentation (Go, Rust, C++) are reported
as OTEL004. For Go, the audit reads direct `go.mod` requirements and reports
cataloged libraries (opentelemetry-go-contrib and library-native
instrumentation): the instrumentation exists but must be added to the
application's code in place of a zero-code agent that would inject it.
Standard-library packages and compile-time instrumentation are not assessed.

The scan skips hidden directories and common build/dependency output
(`node_modules`, `target`, `dist`, ...). Skip other directories with
`--exclude <dir>` (repeatable, relative to the project). Source files are read
only when a detector inspects them.
`observe instrumentation audit --sbom <file>` audits a CycloneDX SBOM directly,
independent of any project on disk: the runtime is inferred from the component
purls and the application is built from the SBOM. Add `--app <id>` to instead
use the SBOM as a detected application's dependency graph, in which case an
empty or incomplete SBOM cannot erase that app's declared dependencies.
Inventory-only SBOMs do not establish which dependencies are direct runtime
dependencies.

The unused `--offline` flag has been removed: the built-in check is always
offline. `--resolve` explicitly invokes installed native package managers in
their offline modes (Cargo, Go, and Maven via a pinned
`maven-dependency-plugin` 3.8.1); this is not an OS network sandbox. When a
resolver cannot run or fails, the application carries a `RESOLVE_FAILED`
diagnostic with the reason. Without a dependency graph (a `package-lock.json`,
`pnpm-lock.yaml`, `uv.lock`, `--sbom`, or `--resolve`), only declared
dependencies are assessed and the application gets an OTEL031 info finding.

OTEL011 and OTEL014 are retired and must not be reused. The audit assesses only
libraries in the support catalog; uncataloged libraries are left unassessed.
Unknown upstream ranges for a cataloged library remain unverified (OTEL015).
Partial version-range coverage is reported separately from full support. Unmeasured manifest parse/failure
counters are omitted rather than inferred from the number of applications.

### Maintaining the Support Catalog

The bundled catalog is a hand-maintained data file
(`src/lib/instrumentation/manifest/otel-support-manifest.yaml`). A missing
library or upstream support range is unverified, not proof of missing
instrumentation or support for every version.

Edit the YAML directly to add or update runtimes and packages. Its shape and
semver ranges are validated by the schema (zod) at load time and by the unit
tests:

```bash
bun run test:otel-manifest
```

For AI-assisted upstream research when adding or updating entries, use the
[`maintain-otel-manifest` skill](.agents/skills/maintain-otel-manifest/SKILL.md).

## Configuration

Credentials are stored in `~/.observe/config.json` with mode `600` (owner-only access). Permissions are automatically enforced on every write.

```bash
# Browser-based login (recommended)
observe auth login

# Login to a specific customer
observe auth login --url 123456.observeinc.com

# Device code flow (for headless environments)
observe auth login --useDeviceCode --url 123456.observeinc.com

# Check current auth status
observe auth status

# Manual configuration
observe auth configure --domain observeinc --customerId 123456 --token YOUR_API_KEY
```

### Profiles

Profiles let you store credentials for multiple Observe environments (e.g. production and staging) and switch between them easily.

```bash
# Login and save credentials under a named profile
observe auth login --profile staging --url 123456.observeinc.com

# List all saved profiles
observe auth profile list

# Permanently switch the default profile
observe auth profile use staging

# Use a profile for a single command without switching the default
OBSERVE_PROFILE=staging observe auth status
```

Profile selection priority: `OBSERVE_PROFILE` env var → `currentProfile` in the config file → `"default"`.

## Agent Skills

Agent skills are instruction documents that teach a coding agent how to drive the CLI, write OPAL,
and investigate with Observe data. Observe curates a set of them in
[observeinc/skills](https://github.com/observeinc/skills); the CLI fetches the current version on
demand, so you do not need to clone anything.

```bash
# Install every curated skill into each coding agent the CLI detects
observe skill install --all

# Install specific skills by name
observe skill install observe-cli generate-opal

# Install into the current repo rather than your home directory
observe skill install --all --project

# Refresh installed skills to the latest published version
observe skill update
```

`observe skill list` shows which skills exist and which are already installed. Skills your
organization stores in Observe are reachable with the same commands under `--user-defined`.

## Contributing

Contributions are welcome! For non-trivial changes, please [open an issue](https://github.com/observeinc/cli/issues) first so we can align on the approach — the change may already be planned, in progress, or out of scope.

Please use [Conventional Commits](https://www.conventionalcommits.org) for commit messages (e.g. `fix(query): handle empty result set`).

---

## Development

### Prerequisites

- [Bun](https://bun.sh)

### Setup

```bash
git clone <repository-url>
cd cli
bun install
```

### Running Locally

```bash
# Run CLI in development mode
bun dev --help

# Run commands
bun dev dataset list
bun dev metric list --match "cpu"
bun dev tag-value list --match checkout
```

### Scripts

```bash
bun dev              # Run CLI in development mode
bun test             # Run codegen, typecheck, lint, format, and unit tests
bun test:integration # Integration tests against a real tenant (requires env vars below)
bun typecheck        # Type checking
bun lint             # Check for issues
bun format           # Check formatting
bun codegen          # Generate GraphQL and REST API types
```

### Integration tests

Add credentials to `.env` (see `.env.example`), then run:

```bash
bun run test:integration
```

## License

Apache-2.0
