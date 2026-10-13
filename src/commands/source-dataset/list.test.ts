import { beforeEach, describe, expect, mock, test } from "bun:test";
import { createMockContext, suppressAnsiColor } from "../../test-helpers";
import { FEATURE_NOT_ENABLED_MESSAGE } from "../../lib/format-error";
import type { listSourceDatasets } from "../../rest/source-dataset/list-source-datasets";
import { list } from "./list";
import { apiError, loadConfigStub, sourceDatasetStub } from "./test-fixtures";

suppressAnsiColor();

const listFn = mock<typeof listSourceDatasets>(() =>
  Promise.resolve({
    sourceDatasets: [sourceDatasetStub()],
    meta: { totalCount: 1 },
  }),
);
const deps = { loadConfig: loadConfigStub, listSourceDatasets: listFn };

describe("source-dataset list", () => {
  beforeEach(() => {
    listFn.mockClear();
  });

  test("combines --match and --filter into one CEL filter", async () => {
    const { context } = createMockContext();
    await list.call(
      context,
      { match: "check", filter: 'label.matches("^Logs/")', limit: 100 },
      deps,
    );
    const [args] = listFn.mock.calls[0]!;
    expect(args.filter).toContain("label");
    expect(args.filter).toContain("&&");
    expect(args.limit).toBe(100);
  });

  test("emits JSON with --json", async () => {
    const { context, stdout } = createMockContext();
    await list.call(context, { json: true, limit: 100 }, deps);
    const payload = JSON.parse(stdout.join("")) as { id: string }[];
    expect(payload[0]!.id).toBe("41000001");
  });

  test("renders a table by default", async () => {
    const { context, stdout } = createMockContext();
    await list.call(context, { limit: 100 }, deps);
    const out = stdout.join("");
    expect(out).toContain("Logs/checkout");
    expect(out).toContain("OtelLogs");
    expect(out).toContain("Receiving");
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
