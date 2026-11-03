import { mock } from "bun:test";
import { ResponseError } from "../../rest/generated/runtime";
import {
  type StorageIntegrationResource,
  StorageIntegrationStorageProvider,
  StorageIntegrationType,
} from "../../rest/generated";

export const loadConfigStub = mock(() => ({
  customerId: "123",
  token: "tok",
  domain: "observeinc.com",
}));

export function storageIntegrationStub(
  overrides: Partial<StorageIntegrationResource> = {},
): StorageIntegrationResource {
  return {
    id: "77",
    name: "prod-lake",
    type: StorageIntegrationType.Iceberg,
    storageProvider: StorageIntegrationStorageProvider.S3,
    awsConfig: {
      s3BaseUrl: "s3://prod-lake/warehouse",
      iamRoleArn: "arn:aws:iam::123:role/observe",
      externalId: "obs_example",
    },
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
