import { describe, expect } from "bun:test";
import {
  loadTenantConfig,
  parseJsonOutput,
  testCiOnly,
  withIntegrationFixture,
} from "./fixture";

interface TagValuePair {
  name: string;
  value: string;
  kind: string;
}

const tenant = loadTenantConfig();

describe("tag-value CLI integration", () => {
  testCiOnly("list returns JSON array", async () => {
    await withIntegrationFixture(tenant, async (fixture) => {
      // tag-value list
      const result = await fixture.runCli`
        observe tag-value list \
          --format json \
          --limit 5
      `;
      const tagValues = parseJsonOutput(result) as TagValuePair[];

      expect(Array.isArray(tagValues)).toBe(true);
      for (const tagValue of tagValues) {
        expect(typeof tagValue.name).toBe("string");
        expect(tagValue.name.length).toBeGreaterThan(0);
        expect(typeof tagValue.value).toBe("string");
        expect(typeof tagValue.kind).toBe("string");
      }
    });
  });
});
