import { mock } from "bun:test";
import { ResponseError } from "../../rest/generated/runtime";
import type { SourceDatasetResource } from "../../rest/source-dataset/types";

export const loadConfigStub = mock(() => ({
  customerId: "123",
  token: "tok",
  domain: "observeinc.com",
}));

export function sourceDatasetStub(
  overrides: Partial<SourceDatasetResource> = {},
): SourceDatasetResource {
  return {
    id: "41000001",
    label: "Logs/checkout",
    isSource: true,
    description: "checkout logs",
    icon: null,
    objectTags: {},
    contentType: "Logs",
    fieldList: [{ name: "body", type: { tag: "string" } }],
    dataSource: {
      kind: "Ingest",
      ingest: {
        storage: "Native",
        schemaType: "OtelLogs",
        iceberg: null,
        metadataDataset: null,
      },
      shareIn: null,
    },
    dataRetentionDays: null,
    effectiveDataRetentionDays: 30,
    accelerationType: "Default",
    accelerationState: "Live",
    correlationTags: [],
    ingestStatus: "Receiving",
    createdBy: { id: "1" },
    updatedBy: { id: "1" },
    createdAt: "2026-10-01T00:00:00Z",
    updatedAt: "2026-10-01T00:00:00Z",
    ...overrides,
  };
}

export function apiError(status: number, type: string, message: string) {
  return new ResponseError(
    new Response(JSON.stringify({ type, message }), {
      status,
      statusText: "",
      headers: { "content-type": "application/json" },
    }),
  );
}
