import { mock } from "bun:test";
import { ResponseError } from "../../rest/generated/runtime";
import type {
  RegistrationToken,
  SetupInfo,
  ShareResource,
  TableResource,
} from "../../rest/share-in/types";

export function setupInfoStub(): SetupInfo {
  return {
    consumerAccount: "OBSERVE.CONSUMER",
    region: "AWS_US_WEST_2",
    cloud: "AWS",
    guidance: {
      summary: "Run this SQL in your Snowflake provider account.",
      setupSql: [
        {
          description: "Create a share.",
          sql: "CREATE SHARE <your_share_name>;",
        },
        {
          description: "Add Observe as a recipient.",
          sql: "ALTER SHARE <your_share_name> ADD ACCOUNTS = OBSERVE.CONSUMER;",
        },
      ],
      providerChecks: [
        {
          description: "List the grants.",
          sql: "SHOW GRANTS TO SHARE <your_share_name>;",
        },
      ],
      checklist: ["Spell the provider account as <ORG>.<ACCOUNT>."],
    },
  };
}

export function tokenStub(token = "secret-token"): RegistrationToken {
  return {
    token,
    expiresAt: "2026-10-21T00:00:00Z",
    setupSql: [
      {
        description: "Set the share comment to this exact token.",
        sql: `ALTER SHARE <your_share_name> SET COMMENT = '${token}';`,
      },
    ],
  };
}

export const loadConfigStub = mock(() => ({
  customerId: "123",
  token: "tok",
  domain: "observeinc.com",
}));

export function shareStub(
  overrides: Partial<ShareResource> = {},
): ShareResource {
  return {
    id: "41000100",
    shareName: "OBSERVE_SHARE",
    label: "Orders share",
    providerType: "Snowflake",
    providerAccount: "ACME.PROD",
    snowflakeConfig: {
      shareName: "OBSERVE_SHARE",
      providerAccount: "ACME.PROD",
    },
    status: { state: "Active", health: "Healthy" },
    createdBy: { id: "1" },
    createdAt: "2026-10-01T00:00:00Z",
    updatedBy: { id: "1" },
    updatedAt: "2026-10-01T00:00:00Z",
    tableCount: 2,
    ...overrides,
  };
}

export function tableStub(
  overrides: Partial<TableResource> = {},
): TableResource {
  return {
    id: "41000200",
    share: { id: "41000100" },
    fullTablePath: "PUBLIC/ORDERS",
    tableName: "ORDERS",
    schemaName: "PUBLIC",
    tableType: "Table",
    status: "Active",
    health: "Healthy",
    cdcStatus: "Enabled",
    sourceDataset: { id: "41000300" },
    tableSchema: {
      columns: [
        { name: "ID", type: "NUMBER", nullable: false },
        { name: "CREATED_AT", type: "TIMESTAMP_NTZ", nullable: true },
      ],
    },
    createdBy: { id: "1" },
    createdAt: "2026-10-01T00:00:00Z",
    updatedBy: { id: "1" },
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
