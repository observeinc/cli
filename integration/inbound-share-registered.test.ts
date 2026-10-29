import { $ } from "bun";
import { describe, expect, test } from "bun:test";
import { errorType } from "../src/lib/format-error";
import { listShares } from "../src/rest/inbound-share/list-shares";
import {
  loadTenantConfig,
  parseJsonOutput,
  TEST_RESOURCE_PREFIX,
  testPrefix,
  withIntegrationFixture,
} from "./fixture";

// A long-lived Snowflake share granted to the tenant's consumer account. Its
// provider account was verified once by hand, so registering it again needs
// no share comment. The share is never deleted here: Snowflake mounts a share
// only once per account, and a mount left behind by an interrupted run would
// block every later run. Only one run may use the share at a time (see the
// inbound-share job in .github/workflows/integration-test.yml).
const SHARE_ENV = {
  NAME: "OBSERVE_INTEGRATION_SHARE_NAME",
  PROVIDER: "OBSERVE_INTEGRATION_SHARE_PROVIDER_ACCOUNT",
  SCHEMA: "OBSERVE_INTEGRATION_SHARE_SCHEMA",
  TABLE: "OBSERVE_INTEGRATION_SHARE_TABLE",
} as const;

const shareName = process.env[SHARE_ENV.NAME];
const providerAccount = process.env[SHARE_ENV.PROVIDER];
const schemaName = process.env[SHARE_ENV.SCHEMA];
const tableName = process.env[SHARE_ENV.TABLE];

// About a dozen CLI calls, two of which create or delete a dataset.
const SHARE_TEST_TIMEOUT_MS = 180_000;

const tenant = loadTenantConfig();

async function apiEnabled(): Promise<boolean> {
  try {
    await listShares({ config: tenant, limit: 1 });
    return true;
  } catch (error) {
    if ((await errorType(error)) === "feature_not_enabled") {
      return false;
    }
    throw error;
  }
}

// Unset GitHub variables arrive as empty strings, so test for truthiness.
const shareConfigured = Boolean(
  shareName && providerAccount && schemaName && tableName,
);

const testIfShare =
  shareConfigured && (await apiEnabled()) ? test.serial : test.skip;

interface ShareJson {
  id: string;
  shareName: string;
  providerAccount: string;
  label: string;
  status: { state: string };
}

interface TrackedTableJson {
  id: string;
  share: { id: string };
  schemaName: string;
  tableName: string;
  sourceDataset: { id: string; record?: { label?: string } } | null;
}

interface UntrackedTableJson {
  schemaName: string;
  tableName: string;
}

describe("inbound-share CLI integration with a registered share", () => {
  testIfShare(
    "register, track, update and untrack a table",
    async () => {
      await withIntegrationFixture(tenant, async (fixture) => {
        const share = parseJsonOutput(
          await fixture.runCli`
            observe inbound-share register --share-name ${shareName} --provider-account ${providerAccount} --json
          `,
        ) as ShareJson;
        expect(share.providerAccount).toBe(providerAccount!.toUpperCase());
        expect(share.status.state).toBe("Active");

        const viewed = parseJsonOutput(
          await fixture.runCli`observe inbound-share view ${share.id} --json`,
        ) as ShareJson;
        expect(viewed.id).toBe(share.id);

        const prefix = testPrefix();
        // A run killed before this cleanup leaves a test label behind; restore
        // the share name then, rather than keeping that label for good.
        const restingLabel = share.label.startsWith(`${TEST_RESOURCE_PREFIX}-`)
          ? share.shareName
          : share.label;
        fixture.registerCleanup(async () => {
          parseJsonOutput(
            await fixture.runCli`
              observe inbound-share update ${share.id} --label ${$.escape(restingLabel)} --json
            `,
          );
        });
        const relabeled = parseJsonOutput(
          await fixture.runCli`
            observe inbound-share update ${share.id} --label ${`${prefix}-share`} --json
          `,
        ) as ShareJson;
        expect(relabeled.label).toBe(`${prefix}-share`);

        // A run that died after tracking leaves the table tracked; untrack it
        // so this run starts from an untracked table. Only touch datasets an
        // earlier run created, never one someone tracked by hand.
        const tracked = parseJsonOutput(
          await fixture.runCli`
            observe inbound-share table list --share-id ${share.id} --expand --json
          `,
        ) as TrackedTableJson[];
        for (const leftover of tracked) {
          if (
            leftover.schemaName !== schemaName ||
            leftover.tableName !== tableName
          ) {
            continue;
          }
          const leftoverLabel = leftover.sourceDataset?.record?.label ?? "";
          if (!leftoverLabel.startsWith(`${TEST_RESOURCE_PREFIX}-`)) {
            throw new Error(
              `${schemaName}.${tableName} is already tracked as dataset "${leftoverLabel}", which this test did not create. Point ${SHARE_ENV.TABLE} at a table only this test uses.`,
            );
          }
          parseJsonOutput(
            await fixture.runCli`
              observe inbound-share table untrack ${leftover.id} --share-id ${share.id} --yes --json
            `,
          );
        }

        const untracked = parseJsonOutput(
          await fixture.runCli`
            observe inbound-share table list --share-id ${share.id} --untracked --json
          `,
        ) as UntrackedTableJson[];
        expect(
          untracked.some(
            (t) => t.schemaName === schemaName && t.tableName === tableName,
          ),
        ).toBe(true);

        const columns = parseJsonOutput(
          await fixture.runCli`
            observe inbound-share table schema --share-id ${share.id} --schema ${schemaName} --table ${tableName} --json
          `,
        ) as unknown[];
        expect(columns.length).toBeGreaterThan(0);

        const datasetLabel = `${prefix}/sharein-table`;
        const table = parseJsonOutput(
          await fixture.runCli`
            observe inbound-share table track --share-id ${share.id} --schema ${schemaName} --table ${tableName} --dataset-label ${datasetLabel} --kind Table --json
          `,
        ) as TrackedTableJson;
        let tableTracked = true;
        fixture.registerCleanup(async () => {
          if (!tableTracked) {
            return;
          }
          parseJsonOutput(
            await fixture.runCli`
              observe inbound-share table untrack ${table.id} --share-id ${share.id} --yes --json
            `,
          );
        });
        expect(table.share.id).toBe(share.id);
        expect(table.sourceDataset?.id).toBeTruthy();

        const renamed = `${prefix}/sharein-table-renamed`;
        parseJsonOutput(
          await fixture.runCli`
            observe inbound-share table update ${table.id} --share-id ${share.id} --dataset-label ${renamed} --json
          `,
        );
        const viewedTable = parseJsonOutput(
          await fixture.runCli`
            observe inbound-share table view ${table.id} --share-id ${share.id} --json
          `,
        ) as TrackedTableJson;
        expect(viewedTable.id).toBe(table.id);

        const removed = parseJsonOutput(
          await fixture.runCli`
            observe inbound-share table untrack ${table.id} --share-id ${share.id} --yes --json
          `,
        ) as { success: boolean; id: string };
        tableTracked = false;
        expect(removed).toEqual({ success: true, id: table.id });

        const after = parseJsonOutput(
          await fixture.runCli`
            observe inbound-share table list --share-id ${share.id} --json
          `,
        ) as TrackedTableJson[];
        expect(after.map((t) => t.id)).not.toContain(table.id);
      });
    },
    SHARE_TEST_TIMEOUT_MS,
  );
});
