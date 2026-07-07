import { describe, expect } from "bun:test";
import {
  loadTenantConfig,
  parseJsonOutput,
  testCiOnly,
  withIntegrationFixture,
} from "./fixture";

interface TagKeyEntry {
  name: string;
  values: string[];
}

const tenant = loadTenantConfig();

describe("tag-key CLI integration", () => {
  testCiOnly("list returns JSON array", async () => {
    await withIntegrationFixture(tenant, async (fixture) => {
      // tag-key list
      const result = await fixture.runCli`
        observe tag-key list \
          --format json \
          --limit 5
      `;
      const tagKeys = parseJsonOutput(result) as TagKeyEntry[];

      expect(Array.isArray(tagKeys)).toBe(true);
      for (const tagKey of tagKeys) {
        expect(typeof tagKey.name).toBe("string");
        expect(tagKey.name.length).toBeGreaterThan(0);
        expect(Array.isArray(tagKey.values)).toBe(true);
      }
    });
  });
});
