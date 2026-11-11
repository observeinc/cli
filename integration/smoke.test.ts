import { describe, expect, test } from "bun:test";
import {
  loadTenantConfig,
  parseJsonOutput,
  withIntegrationFixture,
} from "./fixture";

interface AuthStatusJson {
  authenticated: boolean;
  valid: boolean;
  customerId: string;
  domain: string;
}

interface DatasetJson {
  id: string;
  label: string;
}

const tenant = loadTenantConfig();

describe("CLI integration smoke", () => {
  test("auth status validates credentials", async () => {
    await withIntegrationFixture(tenant, async (fixture) => {
      const result = await fixture.runCli`
        observe auth status --json
      `;
      const status = parseJsonOutput(result) as AuthStatusJson;

      expect(status.authenticated).toBe(true);
      expect(status.valid).toBe(true);
      expect(status.customerId).toBe(tenant.customerId);
      expect(status.domain).toBe(tenant.domain);
    });
  });

  test("dataset list returns JSON array", async () => {
    await withIntegrationFixture(tenant, async (fixture) => {
      const result = await fixture.runCli`
        observe dataset list \
          --format json \
          --limit 5
      `;
      const datasets = parseJsonOutput(result) as DatasetJson[];

      expect(Array.isArray(datasets)).toBe(true);
      expect(datasets.length).toBeGreaterThan(0);
      for (const dataset of datasets) {
        expect(typeof dataset.id).toBe("string");
        expect(dataset.id.length).toBeGreaterThan(0);
        expect(typeof dataset.label).toBe("string");
      }
    });
  });

  test("metric list returns JSON array", async () => {
    await withIntegrationFixture(tenant, async (fixture) => {
      const result = await fixture.runCli`
        observe metric list \
          --format json \
          --limit 1
      `;
      const metrics = parseJsonOutput(result) as unknown[];

      expect(Array.isArray(metrics)).toBe(true);
    });
  });

  test("alert list returns JSON array", async () => {
    await withIntegrationFixture(tenant, async (fixture) => {
      const result = await fixture.runCli`
        observe alert list \
          --format json \
          --limit 1
      `;
      const alerts = parseJsonOutput(result) as unknown[];

      expect(Array.isArray(alerts)).toBe(true);
    });
  });

  // APM is GA: the endpoint is enabled on all integration tenants, so this
  // command must succeed. --json emits { interval, environments, meta }.
  test("apm environments returns the response envelope", async () => {
    await withIntegrationFixture(tenant, async (fixture) => {
      const result = await fixture.runCli`
        observe apm environments \
          --json \
          --interval 1h
      `;
      expect(result.exitCode).toBe(0);
      const response = parseJsonOutput(result) as { environments: unknown[] };
      expect(Array.isArray(response.environments)).toBe(true);
    });
  });

  test("query runs against a dataset from the tenant", async () => {
    await withIntegrationFixture(tenant, async (fixture) => {
      // Pick any dataset from the tenant (all tenants are guaranteed to have at least the System dataset).
      const listResult = await fixture.runCli`
        observe dataset list \
          --format json \
          --limit 1
      `;
      const datasets = parseJsonOutput(listResult) as DatasetJson[];
      expect(datasets.length).toBeGreaterThan(0);

      const firstDataset = datasets[0];
      if (!firstDataset) {
        throw new Error("expected at least one dataset");
      }
      const datasetId = firstDataset.id;

      // query: run a simple pipeline against that dataset.
      const queryResult = await fixture.runCli`
        observe query \
          --input ${datasetId} \
          --pipeline "limit 1" \
          --format json \
          --interval 24h
      `;
      const rows = parseJsonOutput(queryResult) as Record<string, unknown>[];

      expect(Array.isArray(rows)).toBe(true);
    });
  });
});
