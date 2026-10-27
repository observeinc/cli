import { beforeEach, describe, expect, mock, test } from "bun:test";
import { createMockContext, suppressAnsiColor } from "../../test-helpers";
import type { getStorageIntegration } from "../../rest/storage-integration/get-storage-integration";
import { view } from "./view";
import {
  apiError,
  loadConfigStub,
  storageIntegrationStub,
} from "./test-fixtures";

suppressAnsiColor();

const getFn = mock<typeof getStorageIntegration>(() =>
  Promise.resolve(storageIntegrationStub()),
);
const deps = { loadConfig: loadConfigStub, getStorageIntegration: getFn };

describe("storage-integration view", () => {
  beforeEach(() => {
    getFn.mockClear();
  });

  test("passes the id and --expand", async () => {
    const { context } = createMockContext();
    await view.call(context, { expand: true, json: true }, "77", deps);
    const [args] = getFn.mock.calls[0]!;
    expect(args).toMatchObject({ id: "77", expand: true });
  });

  test("renders name, type, and storage provider by default", async () => {
    const { context, stdout } = createMockContext();
    await view.call(context, {}, "77", deps);
    const out = stdout.join("");
    expect(out).toContain("prod-lake");
    expect(out).toContain("Iceberg");
    expect(out).toContain("S3");
    expect(out).toContain("s3://prod-lake/warehouse");
  });

  test("emits the REST resource as JSON", async () => {
    const { context, stdout } = createMockContext();
    await view.call(context, { json: true }, "77", deps);
    const payload = JSON.parse(stdout.join("")) as {
      id: string;
      storageProvider: string;
    };
    expect(payload.id).toBe("77");
    expect(payload.storageProvider).toBe("S3");
  });

  test("gives a not-found message on 404", async () => {
    getFn.mockImplementationOnce(() =>
      Promise.reject(apiError(404, "not_found", "nope")),
    );
    const { context, stderr, getExitCode } = createMockContext();
    await view.call(context, {}, "9", deps);
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain("Storage integration not found: 9");
  });
});
