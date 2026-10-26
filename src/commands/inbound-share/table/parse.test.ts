import { describe, expect, test } from "bun:test";
import {
  buildTableUpdateBody,
  buildTrackBody,
  parseSchemaMapping,
} from "./parse";
import {
  ExternalSharesDatasetKind,
  ExternalSharesFieldMappingConversion,
} from "../../../rest/generated";

const base = {
  schema: "PUBLIC",
  table: "ORDERS",
  datasetLabel: "Snowflake/orders",
};

describe("buildTrackBody", () => {
  test("Table takes no time fields", () => {
    expect(
      buildTrackBody({ ...base, kind: ExternalSharesDatasetKind.Table }),
    ).toEqual({
      schemaName: "PUBLIC",
      tableName: "ORDERS",
      datasetLabel: "Snowflake/orders",
      datasetKind: ExternalSharesDatasetKind.Table,
    });
    expect(() =>
      buildTrackBody({
        ...base,
        kind: ExternalSharesDatasetKind.Table,
        validFrom: "TS",
      }),
    ).toThrow("--kind Table");
  });

  test("Event needs --valid-from only", () => {
    expect(
      buildTrackBody({
        ...base,
        kind: ExternalSharesDatasetKind.Event,
        validFrom: "TS",
      }).validFromField,
    ).toBe("TS");
    expect(() =>
      buildTrackBody({ ...base, kind: ExternalSharesDatasetKind.Event }),
    ).toThrow("--kind Event");
    expect(() =>
      buildTrackBody({
        ...base,
        kind: ExternalSharesDatasetKind.Event,
        validFrom: "A",
        validTo: "B",
      }),
    ).toThrow("--kind Event");
  });

  test("Interval needs both", () => {
    const body = buildTrackBody({
      ...base,
      kind: ExternalSharesDatasetKind.Interval,
      validFrom: "A",
      validTo: "B",
    });
    expect(body.validToField).toBe("B");
    expect(() =>
      buildTrackBody({
        ...base,
        kind: ExternalSharesDatasetKind.Interval,
        validFrom: "A",
      }),
    ).toThrow("--kind Interval");
  });
});

describe("buildTableUpdateBody", () => {
  test("sends only the fields given", () => {
    expect(buildTableUpdateBody({ datasetLabel: "x" })).toEqual({
      datasetLabel: "x",
    });
  });

  test("refuses an empty update", () => {
    expect(() => buildTableUpdateBody({})).toThrow("Nothing to update");
  });
});

describe("parseSchemaMapping", () => {
  test("accepts an object and rejects other JSON", () => {
    expect(
      parseSchemaMapping('{"TS":{"type":"timestamp","conversion":"Direct"}}'),
    ).toEqual({
      TS: {
        type: "timestamp",
        conversion: ExternalSharesFieldMappingConversion.Direct,
      },
    });
    expect(() => parseSchemaMapping("[]")).toThrow("JSON object");
    expect(() => parseSchemaMapping("{")).toThrow("--schema-mapping");
  });
});
