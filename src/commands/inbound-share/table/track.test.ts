import { describe, expect, mock, test } from "bun:test";
import { createMockContext, suppressAnsiColor } from "../../../test-helpers";
import { ExternalSharesDatasetKind } from "../../../rest/generated";
import type { trackShareTable } from "../../../rest/inbound-share/track-share-table";
import { track } from "./track";
import { apiError, loadConfigStub } from "../test-fixtures";

suppressAnsiColor();

const flags = {
  shareId: "41000100",
  schema: "PUBLIC",
  table: "NOPE",
  datasetLabel: "nope",
  kind: ExternalSharesDatasetKind.Table,
};

function depsRejecting(error: Error) {
  return {
    loadConfig: loadConfigStub,
    trackShareTable: mock<typeof trackShareTable>(() => Promise.reject(error)),
  };
}

describe("inbound-share table track", () => {
  test("a 404 names the table and keeps the server's reason", async () => {
    const { context, stderr, getExitCode } = createMockContext();
    await track.call(
      context,
      flags,
      depsRejecting(apiError(404, "not_found", "table not found")),
    );
    expect(getExitCode()).toBe(1);
    const err = stderr.join("");
    expect(err).toContain(
      "Share or table not found: PUBLIC.NOPE in share 41000100",
    );
    expect(err).toContain("table not found");
  });

  test("cdc_not_enabled points at Observe support", async () => {
    const { context, stderr } = createMockContext();
    await track.call(
      context,
      flags,
      depsRejecting(apiError(409, "cdc_not_enabled", "CDC is not supported")),
    );
    expect(stderr.join("")).toContain("Contact Observe support");
  });
});
