/** Shared dashboard stubs for the command tests in this directory. */
import { mock } from "bun:test";
import type { Config } from "../../lib/config";
import {
  DashboardResourceSchemaVersion,
  DashboardResourceVisibility,
  type DashboardListResponseErrorsInner,
  type DashboardResource,
} from "../../rest/generated";

/** A `loadConfig` stub; each suite gets its own so `mockClear` stays isolated. */
export function loadConfigStub() {
  return mock(
    (): Config => ({
      customerId: "test-customer",
      token: "test-token",
      domain: "observeinc.com",
    }),
  );
}

/**
 * Build a `readFile` stub for the --file flag, plus a `withFile` helper that
 * queues a one-off payload for the next read.
 */
export function readFileStub(defaultBody: unknown) {
  const readFile = mock((_path: string) => JSON.stringify(defaultBody));
  return {
    readFile,
    withFile: (body: unknown) =>
      readFile.mockImplementationOnce(() => JSON.stringify(body)),
  };
}

export function dashboardStub(
  overrides: Partial<DashboardResource> = {},
): DashboardResource {
  return {
    id: "41217002",
    schemaVersion: DashboardResourceSchemaVersion.NUMBER_2,
    name: "Test Dashboard",
    description: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-02T00:00:00Z",
    createdBy: { id: "1", label: "Ada Lovelace" },
    updatedBy: { id: "1", label: "Ada Lovelace" },
    managedBy: null,
    visibility: DashboardResourceVisibility.Listed,
    objectTags: {},
    definition: null,
    ...overrides,
  };
}

export function listEnvelope(
  dashboards: DashboardResource[],
  {
    totalCount = dashboards.length,
    errors = [],
  }: {
    totalCount?: number;
    errors?: DashboardListResponseErrorsInner[];
  } = {},
) {
  return { dashboards, meta: { totalCount }, errors };
}
