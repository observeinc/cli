# Observe CLI

Command line interface for [Observe Inc](https://www.observeinc.com).

## Features

- **Knowledge Graph Search** - Resolve entities and entity types via tag keys and tag values to ground investigations in real data.
- **Dataset Management** - List, view, and explore datasets with filtering and field selection.
- **Metric Exploration** - Search, list, and inspect metrics including type, unit, and available dimensions.
- **OPAL Query Execution** - Run OPAL queries directly from your terminal with schema-aware table output.
- **AI Agent Skills** - List and view reusable AI-agent instruction documents stored in Observe.
- **Alert Monitoring** - List and view alerts with severity filtering and active-only views.
- **Datastream Management** - Create, list, view, and update datastreams.
- **Multiple Output Formats** - All commands support `--format json` and `--format csv` for scripting and pipelines.
- **Responsive Tables** - Terminal-aware column widths with automatic text wrapping.

## Installation

Install the CLI:

```bash
curl -fsSL https://raw.githubusercontent.com/observeinc/cli/main/install.sh | bash
```

Install the agent skills shipped under [`skills/`](./skills):

```bash
npx skills add observeinc/cli
```

To update installed skills after edits in this repo, run `npx skills update`.

## Commands

| Command                                 | Description                                             |
| --------------------------------------- | ------------------------------------------------------- |
| `observe help`                          | Show help information                                   |
| `observe auth login`                    | Authenticate with Observe (browser or device code flow) |
| `observe auth logout`                   | Clear stored credentials                                |
| `observe auth status`                   | Show current authentication status                      |
| `observe auth configure`                | Manually configure CLI credentials                      |
| `observe tag-value list`                | Search tag values in the knowledge graph                |
| `observe tag-key list`                  | Search tag keys in the knowledge graph                  |
| `observe dataset list`                  | List datasets with optional filtering                   |
| `observe dataset view`                  | View dataset details and schema                         |
| `observe metric list`                   | Search and list metrics                                 |
| `observe metric view`                   | View metric details and dimensions                      |
| `observe query`                         | Execute OPAL queries on datasets                        |
| `observe skill list`                    | List AI agent skills                                    |
| `observe skill view`                    | View skill details and content                          |
| `observe alert list`                    | List alerts with severity and status filtering          |
| `observe alert view`                    | View full alert details                                 |
| `observe datastream create`             | Create a new datastream                                 |
| `observe datastream list`               | List datastreams                                        |
| `observe datastream view`               | View a datastream by ID                                 |
| `observe datastream update`             | Update a datastream                                     |
| `observe datastream-token check-status` | Poll a datastream token until ingest data arrives       |
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

## Agent Skills

This repo ships skills under [`skills/`](./skills). Install them with the `skills` CLI:

```bash
npx skills add observeinc/cli
```

To update installed skills after edits in this repo, run `npx skills update`.

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
