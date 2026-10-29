import { describe, expect, test } from "bun:test";
import { errorType } from "../src/lib/format-error";
import { listSourceDatasets } from "../src/rest/source-dataset/list-source-datasets";
import { deleteSourceDataset } from "./cleanup";
import {
  INTEGRATION_TIMEOUT,
  loadTenantConfig,
  parseJsonOutput,
  testPrefix,
  withIntegrationFixture,
} from "./fixture";

interface SourceDatasetJson {
  id: string;
  label: string;
  description: string | null;
}

const tenant = loadTenantConfig();

// The API is pre-GA and flag-gated per customer; skip on tenants without it.
async function apiEnabled(): Promise<boolean> {
  try {
    await listSourceDatasets({ config: tenant, limit: 1 });
    return true;
  } catch (error) {
    if ((await errorType(error)) === "feature_not_enabled") {
      return false;
    }
    throw error;
  }
}

const testIfEnabled = (await apiEnabled()) ? test : test.skip;

describe("source-dataset CLI integration", () => {
  testIfEnabled(
    "create, list, view, update, and delete",
    async () => {
      const prefix = testPrefix();
      const label = `${prefix}/source-dataset`;

      await withIntegrationFixture(tenant, async (fixture) => {
        const createResult = await fixture.runCli`
        observe source-dataset create \
          --label ${label} \
          --description ${JSON.stringify("integration test")} \
          --json
      `;
        const created = parseJsonOutput(createResult) as SourceDatasetJson;
        let deleted = false;
        fixture.registerCleanup(async () => {
          if (!deleted) await deleteSourceDataset(tenant, created.id);
        });

        expect(created.label).toBe(label);

        const listResult = await fixture.runCli`
        observe source-dataset list --match ${prefix} --json
      `;
        const listed = parseJsonOutput(listResult) as SourceDatasetJson[];
        expect(listed.some((d) => d.id === created.id)).toBe(true);

        const viewResult = await fixture.runCli`
        observe source-dataset view ${created.id} --json
      `;
        const viewed = parseJsonOutput(viewResult) as SourceDatasetJson;
        expect(viewed.description).toBe("integration test");

        const updateResult = await fixture.runCli`
        observe source-dataset update ${created.id} --clear-description --json
      `;
        const updated = parseJsonOutput(updateResult) as SourceDatasetJson;
        expect(updated.description).toBeNull();

        const deleteResult = await fixture.runCli`
        observe source-dataset delete ${created.id} --yes --json
      `;
        expect(deleteResult.exitCode).toBe(0);
        deleted = true;

        const viewDeleted = await fixture.runCli`
        observe source-dataset view ${created.id}
      `;
        expect(viewDeleted.exitCode).toBe(1);
        expect(viewDeleted.stderr).toContain("Source dataset not found");
      });
    },
    { timeout: INTEGRATION_TIMEOUT.graphRebuild },
  );
});
