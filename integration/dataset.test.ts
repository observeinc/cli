import { describe, expect, test } from "bun:test";
import {
  INTEGRATION_TIMEOUT,
  loadTenantConfig,
  MATERIALIZATION_POLL_TIMEOUT_MS,
  parseJsonOutput,
  retryUntil,
  testPrefix,
  withIntegrationFixture,
} from "./fixture";
import { createTestDataset } from "./setup";

interface DatasetListEntry {
  id: string;
  label: string;
}

interface DatasetViewJson {
  id: string;
  label: string;
  fieldList?: { name: string }[];
}

interface QueryRow {
  test?: string | number;
}

const tenant = loadTenantConfig();

describe("dataset CLI integration", () => {
  test(
    "list and view an API-created dataset",
    async () => {
      const label = `${testPrefix()}-dataset`;
      const opal = `
filter true
make_col test:5
`.trim();

      await withIntegrationFixture(tenant, async (fixture) => {
        // Seed a dataset via API (not under test).
        const created = await createTestDataset(fixture, label, opal);

        // dataset list: exact filter finds the fixture by label.
        const listFilter = `label == ${JSON.stringify(label)}`;
        const listResult = await fixture.runCli`
        observe dataset list \
          --format json \
          --filter ${JSON.stringify(listFilter)}
      `;
        const listed = parseJsonOutput(listResult) as DatasetListEntry[];

        expect(Array.isArray(listed)).toBe(true);
        expect(listed).toHaveLength(1);
        expect(listed[0]?.id).toBe(created.id);
        expect(listed[0]?.label).toBe(label);

        // dataset view: metadata reflects the saved OPAL pipeline.
        const viewResult = await fixture.runCli`
        observe dataset view ${created.id} \
          --format json
      `;
        const viewed = parseJsonOutput(viewResult) as DatasetViewJson;

        expect(viewed.id).toBe(created.id);
        expect(viewed.label).toBe(label);
        expect(viewed.fieldList?.some((field) => field.name === "test")).toBe(
          true,
        );

        // query: dataset is queryable once materialized; OPAL output includes test=5.
        const rows = await retryUntil(
          async () => {
            const queryResult = await fixture.runCli`
            observe query \
              --input ${created.id} \
              --pipeline "limit 1" \
              --format json \
              --interval 30d
          `;
            return parseJsonOutput(queryResult) as QueryRow[];
          },
          (result) => result.length > 0,
          { timeoutMs: MATERIALIZATION_POLL_TIMEOUT_MS },
        );

        expect(rows[0]?.test).toBe("5");
      });
    },
    { timeout: INTEGRATION_TIMEOUT.materialization },
  );
});
