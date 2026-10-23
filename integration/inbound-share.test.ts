import { describe, expect, test } from "bun:test";
import { errorType } from "../src/commands/inbound-share/shared";
import { listShares } from "../src/rest/inbound-share/list-shares";
import {
  loadTenantConfig,
  parseJsonOutput,
  withIntegrationFixture,
} from "./fixture";

const tenant = loadTenantConfig();

// The API is pre-GA and flag-gated per customer; skip on tenants without it
// (403 feature_not_enabled). Any other error, including a permission 403, fails.
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

const testIfEnabled = (await apiEnabled()) ? test : test.skip;

// Registering needs a real provider share, so this covers the read paths only.
describe("inbound-share CLI integration", () => {
  testIfEnabled("setup returns guidance and list works", async () => {
    await withIntegrationFixture(tenant, async (fixture) => {
      const setupResult = await fixture.runCli`
        observe inbound-share setup --json
      `;
      const setup = parseJsonOutput(setupResult) as {
        consumerAccount: string;
        guidance: { setupSql: unknown[] };
      };
      expect(setup.consumerAccount).toContain(".");
      expect(setup.guidance.setupSql.length).toBeGreaterThan(0);

      const listResult = await fixture.runCli`
        observe inbound-share list --json
      `;
      expect(listResult.exitCode).toBe(0);
      expect(Array.isArray(parseJsonOutput(listResult))).toBe(true);
    });
  });

  testIfEnabled("offers and tracked tables across shares list", async () => {
    await withIntegrationFixture(tenant, async (fixture) => {
      const offersResult = await fixture.runCli`
        observe inbound-share offers --json
      `;
      expect(offersResult.exitCode).toBe(0);
      expect(Array.isArray(parseJsonOutput(offersResult))).toBe(true);

      const tablesResult = await fixture.runCli`
        observe inbound-share table list --json --limit 5
      `;
      expect(tablesResult.exitCode).toBe(0);
      const tables = parseJsonOutput(tablesResult) as {
        share: { id: string };
      }[];
      for (const table of tables) {
        expect(table.share.id).toBeTruthy();
      }
    });
  });
});
