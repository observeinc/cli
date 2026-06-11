import { buildCommand } from "@stricli/core";
import type { LocalContext } from "../../context.js";
import { getDatastreamToken } from "../../gql/connection/get-datastream-token.js";
import { GqlApiError } from "../../gql/gql-request.js";
import { loadConfig } from "../../lib/config.js";

interface CheckStatusFlags {
  tokenId: string;
  timeoutSeconds?: number;
  pollIntervalSeconds?: number;
}

export interface CheckStatusDeps {
  loadConfig?: typeof loadConfig;
}

export async function checkStatus(
  this: LocalContext,
  flags: CheckStatusFlags,
  deps: CheckStatusDeps = {},
): Promise<void> {
  const { loadConfig: loadConfigImpl = loadConfig } = deps;
  const { process, writer } = this;

  try {
    const config = loadConfigImpl();
    const timeoutMs = (flags.timeoutSeconds ?? 60) * 1000;
    const intervalMs = (flags.pollIntervalSeconds ?? 5) * 1000;
    const deadline = Date.now() + timeoutMs;

    writer.write(`Checking token ${flags.tokenId}...`);

    while (Date.now() < deadline) {
      const token = await getDatastreamToken(config, { id: flags.tokenId });

      const hasData =
        token.stats?.observations != null &&
        token.stats.observations.length > 0 &&
        token.stats.observations.some((o) => parseInt(o.value, 10) > 0);

      if (hasData) {
        writer.write(JSON.stringify({ status: "receiving", token }, null, 2));
        return;
      }

      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      writer.write(`No data yet. ${remaining}s remaining. Retrying...`);

      if (Date.now() + intervalMs >= deadline) break;
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    writer.write(
      JSON.stringify(
        { status: "no-data", message: "Timed out waiting for data" },
        null,
        2,
      ),
    );
  } catch (error) {
    if (error instanceof GqlApiError) {
      writer.error(`API Error (${error.statusCode}): ${error.message}`);
    } else {
      const message = error instanceof Error ? error.message : String(error);
      writer.error(`Error: ${message}`);
    }
    process.exit(1);
  }
}

export const checkStatusCommand = buildCommand({
  loader: async () => checkStatus,
  parameters: {
    positional: { kind: "tuple", parameters: [] },
    flags: {
      tokenId: {
        kind: "parsed",
        parse: String,
        brief: "Datastream token ID to poll (from datasource create output)",
        optional: false,
      },
      timeoutSeconds: {
        kind: "parsed",
        parse: Number,
        brief: "How long to wait for data in seconds (default: 60)",
        optional: true,
      },
      pollIntervalSeconds: {
        kind: "parsed",
        parse: Number,
        brief: "Polling interval in seconds (default: 5)",
        optional: true,
      },
    },
  },
  docs: {
    brief: "Poll a datastream token until data is received",
    fullDescription:
      "Repeatedly checks a datastream token's stats until observations arrive\n" +
      "or the timeout is reached. The token ID comes from the\n" +
      "datastreamTokenID field in 'observe datasource create' output.\n\n" +
      "Example:\n" +
      "  observe datastream-token check-status --token-id <datastreamTokenID>",
  },
});
