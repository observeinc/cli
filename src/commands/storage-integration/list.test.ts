import { beforeEach, describe, expect, mock, test } from "bun:test";
import { createMockContext, suppressAnsiColor } from "../../test-helpers";
import { FEATURE_NOT_ENABLED_MESSAGE } from "../../lib/format-error";
import type { listStorageIntegrations } from "../../rest/storage-integration/list-storage-integrations";
import { list } from "./list";
import {
  apiError,
  loadConfigStub,
  storageIntegrationStub,
} from "./test-fixtures";

suppressAnsiColor();

const listFn = mock<typeof listStorageIntegrations>(() =>
  Promise.resolve({
    storageIntegrations: [storageIntegrationStub()],
    meta: { totalCount: 1 },
  }),
);
const deps = { loadConfig: loadConfigStub, listStorageIntegrations: listFn };

describe("storage-integration list", () => {
  beforeEach(() => {
    listFn.mockClear();
  });

  test("combines --match and --filter into one CEL filter", async () => {
    const { context } = createMockContext();
    await list.call(
      context,
      { match: "prod", filter: 'type == "Iceberg"', limit: 100 },
      deps,
    );
    const [args] = listFn.mock.calls[0]!;
    expect(args.filter).toContain("name.matches");
    expect(args.filter).toContain("&&");
    expect(args.filter).toContain('type == "Iceberg"');
    expect(args.limit).toBe(100);
  });

  test("emits a JSON array of REST resources with --json", async () => {
    const { context, stdout } = createMockContext();
    await list.call(context, { json: true, limit: 100 }, deps);
    const payload = JSON.parse(stdout.join("")) as {
      id: string;
      name: string;
    }[];
    expect(Array.isArray(payload)).toBe(true);
    expect(payload[0]!.id).toBe("77");
    expect(payload[0]!.name).toBe("prod-lake");
  });

  test("renders a table by default", async () => {
    const { context, stdout } = createMockContext();
    await list.call(context, { limit: 100 }, deps);
    const out = stdout.join("");
    expect(out).toContain("prod-lake");
    expect(out).toContain("Iceberg");
    expect(out).toContain("S3");
  });

  test("--fields picks the columns", async () => {
    const { context, stdout } = createMockContext();
    await list.call(context, { limit: 100, fields: ["id", "createdAt"] }, deps);
    const out = stdout.join("");
    expect(out).toContain("CREATED");
    expect(out).not.toContain("prod-lake");
  });

  test("points at the next page while totalCount says there are more", async () => {
    listFn.mockImplementationOnce(() =>
      Promise.resolve({
        storageIntegrations: [storageIntegrationStub()],
        meta: { totalCount: 3 },
      }),
    );
    const { context, stdout } = createMockContext();
    await list.call(context, { limit: 100, offset: 1 }, deps);
    const out = stdout.join("");
    expect(out).toContain("(3 total)");
    expect(out).toContain("--offset 2");
  });

  test("omits the total and the hint on the last page of an unknown total", async () => {
    listFn.mockImplementationOnce(() =>
      Promise.resolve({
        storageIntegrations: [storageIntegrationStub()],
        meta: { totalCount: -1 },
      }),
    );
    const { context, stdout } = createMockContext();
    await list.call(context, { limit: 100 }, deps);
    const out = stdout.join("");
    expect(out).not.toContain("total");
    expect(out).not.toContain("--offset");
  });

  test("shows the friendly message when the API is not enabled", async () => {
    listFn.mockImplementationOnce(() =>
      Promise.reject(
        apiError(403, "feature_not_enabled", "not enabled for customer 123"),
      ),
    );
    const { context, stderr, getExitCode } = createMockContext();
    await list.call(context, { limit: 100 }, deps);
    expect(getExitCode()).toBe(1);
    expect(stderr.join("")).toContain(FEATURE_NOT_ENABLED_MESSAGE);
    expect(stderr.join("")).not.toContain("customer 123");
  });

  test("keeps the server message for a permission 403", async () => {
    listFn.mockImplementationOnce(() =>
      Promise.reject(
        apiError(403, "failed_authorization", "permission denied"),
      ),
    );
    const { context, stderr } = createMockContext();
    await list.call(context, { limit: 100 }, deps);
    expect(stderr.join("")).toContain("permission denied");
  });
});
