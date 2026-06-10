# Observe CLI

Command line interface for [Observe Inc](https://www.observeinc.com).

## Features

- **OPAL Query Execution** - Run OPAL queries directly from your terminal with schema-aware table output.
- **Dataset Management** - List, view, and explore datasets with filtering and field selection.
- **Datastream Management** - Create, list, view, and update datastreams.
- **Ingest Token Management** - Full CRUD for ingest tokens with datastream association.
- **Data Integrations** - Create data connections and datasources (AWS, Kubernetes, host) and generate CloudFormation quick-create URLs for AWS filedrop deployments.
- **Metric Exploration** - Search, list, and inspect metrics including type, unit, and available dimensions.
- **Alert Monitoring** - List and view alerts with severity filtering and active-only views.
- **Content Packs** - Install and view Host Explorer, Kubernetes Explorer, and Trace Explorer content.
- **Knowledge Graph Search** - Resolve entities and entity types via tag keys and tag values to ground investigations in real data.
- **AI Agent Skills** - List and view reusable AI-agent instruction documents stored in Observe.
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
| `observe auth login`                    | Authenticate with Observe (browser or device code flow) |
| `observe auth logout`                   | Clear stored credentials                                |
| `observe auth status`                   | Show current authentication status                      |
| `observe auth configure`                | Manually configure CLI credentials                      |
| `observe dataset list`                  | List datasets with optional filtering                   |
| `observe dataset view`                  | View dataset details and schema                         |
| `observe datastream create`             | Create a new datastream                                 |
| `observe datastream list`               | List datastreams                                        |
| `observe datastream view`               | View a datastream by ID                                 |
| `observe datastream update`             | Update a datastream                                     |
| `observe ingest-token create`           | Create a new ingest token                               |
| `observe ingest-token list`             | List and search ingest tokens                           |
| `observe ingest-token view`             | View an ingest token by ID                              |
| `observe ingest-token update`           | Update an ingest token                                  |
| `observe data-connection create`        | Create a data connection (AWS, kubernetes, host, etc.)  |
| `observe data-connection list`          | List data connections                                   |
| `observe data-connection view`          | View a data connection by ID (with its datasources)     |
| `observe datasource create`             | Create a datasource attached to a data connection       |
| `observe datasource update`             | Update an existing datasource's config                  |
| `observe datasource generate-stack-url` | Build a CloudFormation quick-create URL for a filedrop  |
| `observe datastream-token check-status` | Poll a datastream token until ingest data arrives       |
| `observe metric list`                   | Search and list metrics                                 |
| `observe metric view`                   | View metric details and dimensions                      |
| `observe alert list`                    | List alerts with severity and status filtering          |
| `observe alert view`                    | View full alert details                                 |
| `observe content host install`          | Install Host Explorer content                           |
| `observe content host view`             | View Host Explorer content                              |
| `observe content kubernetes install`    | Install Kubernetes Explorer content                     |
| `observe content kubernetes view`       | View Kubernetes Explorer content                        |
| `observe content tracing install`       | Install Trace Explorer content                          |
| `observe content tracing view`          | View Trace Explorer content                             |
| `observe tag-key list`                  | Search tag keys in the knowledge graph                  |
| `observe tag-value list`                | Search tag values in the knowledge graph                |
| `observe skill list`                    | List AI agent skills                                    |
| `observe skill view`                    | View skill details and content                          |
| `observe query`                         | Execute OPAL queries on datasets                        |
| `observe cli install`                   | Configure shell integration (PATH, completions)         |
| `observe cli uninstall`                 | Remove shell integration                                |
| `observe cli upgrade`                   | Upgrade to the latest version                           |
| `observe help`                          | Show help information                                   |

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
bun test             # Run codegen, typecheck, lint, format, and tests
bun typecheck        # Type checking
bun lint             # Check for issues
bun format           # Check formatting
bun codegen          # Generate GraphQL and REST API types
```

## License

Apache-2.0
