import { describe, expect, test } from "bun:test";
import { ResponseError } from "../src/rest/generated/runtime";
import { listShares } from "../src/rest/share-in/list-shares";
import {
  loadTenantConfig,
  parseJsonOutput,
  withIntegrationFixture,
} from "./fixture";

const tenant = loadTenantConfig();

// The API is pre-GA and flag-gated per customer; skip on tenants without it.
async function apiEnabled(): Promise<boolean> {
  try {
    await listShares({ config: tenant, limit: 1 });
    return true;
  } catch (error) {
    if (error instanceof ResponseError && error.response.status === 403) {
      return false;
    }
    throw error;
  }
}

const testIfEnabled = (await apiEnabled()) ? test : test.skip;

// Registering needs a real provider share, so this covers the read paths only.
describe("share-in CLI integration", () => {
  testIfEnabled("setup returns guidance and list works", async () => {
    await withIntegrationFixture(tenant, async (fixture) => {
      const setupResult = await fixture.runCli`
        observe share-in setup --json
      `;
      const setup = parseJsonOutput(setupResult) as {
        consumerAccount: string;
        guidance: { setupSql: unknown[] };
      };
      expect(setup.consumerAccount).toContain(".");
      expect(setup.guidance.setupSql.length).toBeGreaterThan(0);

      const listResult = await fixture.runCli`
        observe share-in list --json
      `;
      expect(listResult.exitCode).toBe(0);
      expect(Array.isArray(parseJsonOutput(listResult))).toBe(true);
    });
  });
});
