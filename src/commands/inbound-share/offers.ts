import { defineCommand } from "../../lib/stricli-wrappers";
import chalk from "chalk";
import type { LocalContext } from "../../context";
import { listInboundOffers } from "../../rest/inbound-share/list-inbound-offers";
import type { InboundOffer } from "../../rest/inbound-share/types";
import { loadConfig } from "../../lib/config";
import { formatApiError } from "../../lib/format-error";
import { muteStatusWriter } from "../../lib/writer";
import { parseNonNegativeInt } from "../../lib/parsers";
import {
  formatTable,
  createColumnHelper,
  type ColumnDef,
} from "../../lib/formatters/table";
import { renderAsCSV } from "../../lib/formatters/csv";
import {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  MIN_LIMIT,
  parseLimit,
  type OutputFormat,
} from "./shared";

interface OffersFlags {
  limit: number;
  offset?: number;
  format?: OutputFormat;
  json?: boolean;
}

const col = createColumnHelper<InboundOffer>();

const COLUMNS: ColumnDef<InboundOffer>[] = [
  col.accessor((row) => row.shareName, { header: "SHARE" }),
  col.accessor((row) => row.providerAccount, {
    header: "PROVIDER",
    format: (value) => chalk.dim(value),
  }),
  col.accessor((row) => row.description ?? "", { header: "DESCRIPTION" }),
  col.accessor((row) => row.createdAt ?? "", { header: "CREATED" }),
];

export interface OffersDeps {
  loadConfig?: typeof loadConfig;
  listInboundOffers?: typeof listInboundOffers;
}

export async function offers(
  this: LocalContext,
  flags: OffersFlags,
  deps: OffersDeps = {},
): Promise<void> {
  const {
    loadConfig: loadConfigImpl = loadConfig,
    listInboundOffers: listImpl = listInboundOffers,
  } = deps;
  const format = flags.json ? ("json" as const) : flags.format;
  const { process, writer: _writer } = this;
  const writer = muteStatusWriter(_writer, {
    muted: format === "json" || format === "csv",
  });

  try {
    const config = loadConfigImpl();

    writer.info("Fetching share offers...");

    const response = await listImpl({
      config,
      limit: flags.limit,
      offset: flags.offset,
    });
    const rows = response.offers;

    if (format === "json") {
      writer.write(JSON.stringify(rows, null, 2));
      return;
    }

    if (format === "csv") {
      writer.write(renderAsCSV(rows));
      return;
    }

    if (rows.length === 0) {
      writer.warn(
        "No unregistered shares offered. Offers are listed only for provider accounts you have already registered a share from.",
      );
      return;
    }

    writer.write(
      chalk.green(
        `Found ${rows.length} offered share(s) (${response.meta.totalCount} total):\n`,
      ),
    );
    writer.write(formatTable(rows, COLUMNS));
    writer.info(
      "\nRegister one with: observe inbound-share register --share-name <SHARE> --provider-account <PROVIDER>",
    );

    if (rows.length === flags.limit) {
      const nextOffset = (flags.offset ?? 0) + flags.limit;
      writer.info(
        `More results may be available. Use --offset ${nextOffset} to see the next page.`,
      );
    }
  } catch (error) {
    writer.error(`Error: ${await formatApiError(error)}`);
    process.exitCode = 1;
  }
}

export const offersCommand = defineCommand({
  experimental: true,
  loader: async () => offers,
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [],
    },
    flags: {
      limit: {
        kind: "parsed",
        parse: parseLimit,
        brief: `Maximum number of offers to return (${MIN_LIMIT}-${MAX_LIMIT})`,
        default: String(DEFAULT_LIMIT),
      },
      offset: {
        kind: "parsed",
        parse: parseNonNegativeInt,
        brief: "Offset for pagination (skip this many results)",
        optional: true,
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
    aliases: {
      l: "limit",
    },
  },
  docs: {
    brief: "List unregistered shares offered by your provider accounts",
    fullDescription: [
      "List the Snowflake shares offered to Observe by provider accounts you have",
      "already registered a share from, leaving out shares already registered.",
    ].join("\n"),
  },
});
