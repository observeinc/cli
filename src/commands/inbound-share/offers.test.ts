import { beforeEach, describe, expect, mock, test } from "bun:test";
import { createMockContext, suppressAnsiColor } from "../../test-helpers";
import type { listInboundOffers } from "../../rest/inbound-share/list-inbound-offers";
import type { ExternalSharesInboundOffer } from "../../rest/generated";
import { offers } from "./offers";
import { loadConfigStub } from "./test-fixtures";

suppressAnsiColor();

const offer: ExternalSharesInboundOffer = {
  providerAccount: "ACME.PROD",
  shareName: "BILLING_SHARE",
  description: "Billing data",
  owner: "ACCOUNTADMIN",
  createdAt: "2026-10-01T00:00:00Z",
  suggestedLocalName: null,
};
const listFn = mock<typeof listInboundOffers>(() =>
  Promise.resolve({ offers: [offer], meta: { totalCount: 1 } }),
);
const deps = { loadConfig: loadConfigStub, listInboundOffers: listFn };

describe("inbound-share offers", () => {
  beforeEach(() => {
    listFn.mockClear();
  });

  test("renders the offered shares with a register hint", async () => {
    const { context, stdout } = createMockContext();
    await offers.call(context, { limit: 50, offset: 10 }, deps);
    expect(listFn.mock.calls[0]![0]).toMatchObject({ limit: 50, offset: 10 });
    const out = stdout.join("");
    expect(out).toContain("BILLING_SHARE");
    expect(out).toContain("ACME.PROD");
    expect(out).toContain("observe inbound-share register");
  });

  test("--json prints the rows", async () => {
    const { context, stdout } = createMockContext();
    await offers.call(context, { limit: 100, json: true }, deps);
    expect(JSON.parse(stdout.join(""))).toEqual([offer]);
  });

  test("explains an empty list", async () => {
    listFn.mockImplementationOnce(() =>
      Promise.resolve({ offers: [], meta: { totalCount: 0 } }),
    );
    const { context, stdout, stderr } = createMockContext();
    await offers.call(context, { limit: 100 }, deps);
    expect(stdout.join("") + stderr.join("")).toContain(
      "already registered a share from",
    );
  });
});
