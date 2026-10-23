import { beforeEach, describe, expect, mock, test } from "bun:test";
import { createMockContext, suppressAnsiColor } from "../../test-helpers";
import type { createSourceDataset } from "../../rest/source-dataset/create-source-dataset";
import { buildCreateBody, create } from "./create";
import { apiError, loadConfigStub, sourceDatasetStub } from "./test-fixtures";

suppressAnsiColor();

const createFn = mock<typeof createSourceDataset>(() =>
  Promise.resolve(sourceDatasetStub()),
);
const deps = { loadConfig: loadConfigStub, createSourceDataset: createFn };

describe("source-dataset create", () => {
  beforeEach(() => {
    createFn.mockClear();
  });

  test("builds the body from flags", () => {
    expect(
      buildCreateBody({
        label: "Logs/checkout",
        description: "d",
        tag: [["team", "core"]],
        retentionDays: 14,
        schemaType: "OtelLogs",
      }),
    ).toEqual({
      label: "Logs/checkout",
      description: "d",
      objectTags: { team: ["core"] },
      dataRetentionDays: 14,
      dataSource: {
        kind: "Ingest",
        ingest: {
          storage: undefined,
          schemaType: "OtelLogs",
          iceberg: undefined,
        },
      },
    });
  });

  test("leaves dataSource out when no ingest flags are set", () => {
    expect(buildCreateBody({ label: "Logs/a" })).toEqual({ label: "Logs/a" });
  });

  test("sends the storage integration with Iceberg storage", () => {
    const body = buildCreateBody({
      label: "Logs/a",
      storage: "Iceberg",
      storageIntegrationId: "77",
    });
    expect(body.dataSource?.ingest?.iceberg).toEqual({
      storageIntegrationId: "77",
    });
  });

  test("rejects Iceberg without a storage integration and vice versa", () => {
    expect(() => buildCreateBody({ label: "a/b", storage: "Iceberg" })).toThrow(
      /requires --storage-integration-id/,
    );
    expect(() =>
      buildCreateBody({ label: "a/b", storageIntegrationId: "77" }),
    ).toThrow(/requires --storage Iceberg/);
  });

  test("prints the created id", async () => {
    const { context, stdout } = createMockContext();
    await create.call(context, { label: "Logs/checkout" }, deps);
    expect(createFn.mock.calls[0]![0].body).toEqual({ label: "Logs/checkout" });
    expect(stdout.join("")).toContain("41000001");
  });

  test("passes a 409 through with the server message", async () => {
    createFn.mockImplementationOnce(() =>
      Promise.reject(apiError(409, "already_exists", "label already exists")),
    );
    const { context, stderr, getExitCode } = createMockContext();
    await create.call(context, { label: "Logs/checkout" }, deps);
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("label already exists");
    expect(stderr.join("")).toContain("observe source-dataset update");
  });
});
