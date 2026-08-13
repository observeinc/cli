import { describe, expect } from "bun:test";
import {
  loadTenantConfig,
  parseJsonOutput,
  testCiOnly,
  withIntegrationFixture,
} from "./fixture";

interface TagEntry {
  name: string;
  values: string[];
}

const tenant = loadTenantConfig();

describe("tag CLI integration", () => {
  testCiOnly("list returns JSON array", async () => {
    await withIntegrationFixture(tenant, async (fixture) => {
      // tag list
      const result = await fixture.runCli`
        observe tag list \
          --format json \
          --limit 5
      `;
      const tags = parseJsonOutput(result) as TagEntry[];

      expect(Array.isArray(tags)).toBe(true);
      for (const tag of tags) {
        expect(typeof tag.name).toBe("string");
        expect(tag.name.length).toBeGreaterThan(0);
        expect(Array.isArray(tag.values)).toBe(true);
      }
    });
  });
});
