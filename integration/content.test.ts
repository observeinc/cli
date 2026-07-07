import { describe, expect } from "bun:test";
import {
  loadTenantConfig,
  parseJsonOutput,
  testCiOnly,
  withIntegrationFixture,
} from "./fixture";

interface KubernetesContentJson {
  otelLogsDatasetId: string;
  prometheusDatasetId: string;
  entityDatasetId: string;
  kubernetesLogsDatasetId: string;
}

interface TracingContentJson {
  traceDatasetId: string;
  spanRawDatasetId: string;
  spanEventDatasetId: string;
  spanLinkDatasetId: string;
  otelMetricsDatasetId: string;
}

const tenant = loadTenantConfig();

describe("content CLI integration", () => {
  // CI tenant: host content not installed; command returns null JSON.
  testCiOnly("host view returns null when not installed", async () => {
    await withIntegrationFixture(tenant, async (fixture) => {
      // content host view
      const result = await fixture.runCli`
        observe content host view
      `;
      const status = parseJsonOutput(result);

      expect(status).toBeNull();
    });
  });

  // CI tenant: Kubernetes Explorer content pack pre-installed.
  testCiOnly("kubernetes view returns installed content metadata", async () => {
    await withIntegrationFixture(tenant, async (fixture) => {
      // content kubernetes view
      const result = await fixture.runCli`
        observe content kubernetes view
      `;
      const status = parseJsonOutput(result) as KubernetesContentJson;

      expect(status).toMatchObject({
        otelLogsDatasetId: expect.any(String),
        prometheusDatasetId: expect.any(String),
        entityDatasetId: expect.any(String),
        kubernetesLogsDatasetId: expect.any(String),
      });
    });
  });

  // CI tenant: Tracing Explorer content pack pre-installed.
  testCiOnly("tracing view returns installed content metadata", async () => {
    await withIntegrationFixture(tenant, async (fixture) => {
      // content tracing view
      const result = await fixture.runCli`
        observe content tracing view
      `;
      const status = parseJsonOutput(result) as TracingContentJson;

      expect(status).toMatchObject({
        traceDatasetId: expect.any(String),
        spanRawDatasetId: expect.any(String),
        spanEventDatasetId: expect.any(String),
        spanLinkDatasetId: expect.any(String),
        otelMetricsDatasetId: expect.any(String),
      });
    });
  });
});
