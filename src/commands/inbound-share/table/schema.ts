import { defineCommand } from "../../../lib/stricli-wrappers";
import chalk from "chalk";
import type { LocalContext } from "../../../context";
import { getUntrackedTableSchema } from "../../../rest/inbound-share/get-untracked-table-schema";
import type { TableSchema } from "../../../rest/inbound-share/types";
import { loadConfig } from "../../../lib/config";
import { formatApiError } from "../../../lib/format-error";
import { muteStatusWriter } from "../../../lib/writer";
import {
  formatTable,
  createColumnHelper,
  type ColumnDef,
} from "../../../lib/formatters/table";
import { renderAsCSV } from "../../../lib/formatters/csv";
import { isNotFound, type OutputFormat } from "../shared";
import { shellQuote } from "../sql";

interface SchemaFlags {
  shareId: string;
  schema: string;
  format?: OutputFormat;
  json?: boolean;
}

type Column = TableSchema["columns"][number];

const col = createColumnHelper<Column>();

const COLUMNS: ColumnDef<Column>[] = [
  col.accessor((row) => row.name, { header: "COLUMN" }),
  col.accessor((row) => row.type, { header: "TYPE" }),
  col.accessor((row) => (row.nullable ? "yes" : "no"), {
    header: "NULLABLE",
    format: (value) => chalk.dim(value),
  }),
];

export interface SchemaDeps {
  loadConfig?: typeof loadConfig;
  getUntrackedTableSchema?: typeof getUntrackedTableSchema;
}

export async function schema(
  this: LocalContext,
  flags: SchemaFlags,
  tableName: string,
  deps: SchemaDeps = {},
): Promise<void> {
  const { shareId } = flags;
  const {
    loadConfig: loadConfigImpl = loadConfig,
    getUntrackedTableSchema: getImpl = getUntrackedTableSchema,
  } = deps;
  const format = flags.json ? ("json" as const) : flags.format;
  const { process, writer: _writer } = this;
  const writer = muteStatusWriter(_writer, {
    muted: format === "json" || format === "csv",
  });
  const fullName = `${flags.schema}.${tableName}`;

  try {
    const config = loadConfigImpl();

    writer.info("Fetching table schema...");

    const { columns } = await getImpl({
      config,
      shareId,
      schemaName: flags.schema,
      tableName,
    });

    if (format === "json") {
      writer.write(JSON.stringify(columns, null, 2));
      return;
    }

    if (format === "csv") {
      writer.write(renderAsCSV(columns));
      return;
    }

    writer.write(chalk.bold.white(fullName) + "\n");
    writer.write(formatTable(columns, COLUMNS));
    writer.info(
      `\nTrack it with: observe inbound-share table track --share-id ${shareId} --schema ${shellQuote(flags.schema)} --table ${shellQuote(tableName)} ...`,
    );
  } catch (error) {
    if (isNotFound(error)) {
      writer.error(
        `Share or untracked table not found: ${fullName} in share ${shareId} (${await formatApiError(error)})`,
      );
    } else {
      writer.error(`Error: ${await formatApiError(error)}`);
    }
    process.exitCode = 1;
  }
}

export const schemaCommand = defineCommand({
  experimental: true,
  loader: async () => schema,
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [
        {
          placeholder: "tableName",
          brief: "Snowflake table or view name (case-sensitive)",
          parse: String,
        },
      ],
    },
    flags: {
      shareId: {
        kind: "parsed",
        parse: String,
        brief: "ID of the share the table belongs to",
        optional: false,
      },
      schema: {
        kind: "parsed",
        parse: String,
        brief: "Snowflake schema that holds the table (case-sensitive)",
      },
      format: {
        kind: "enum",
        values: ["json", "csv"],
        brief: "Output format (json, csv)",
        optional: true,
      },
      json: {
        kind: "boolean",
        brief: "Output as JSON (shorthand for --format=json)",
        optional: true,
      },
    },
    aliases: {},
  },
  docs: {
    brief: "Show the columns of a table in a share that is not tracked yet",
    fullDescription: [
      "Preview the Snowflake columns of an untracked table, to pick --valid-from,",
      "--valid-to and --schema-mapping before `table track`.",
      "",
      "Example:",
      "  observe inbound-share table schema ORDERS --share-id 41000100 --schema PUBLIC",
    ].join("\n"),
  },
});
