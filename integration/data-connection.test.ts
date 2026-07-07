import { describe, expect } from "bun:test";
import {
  loadTenantConfig,
  parseJsonOutput,
  testCiOnly,
  withIntegrationFixture,
} from "./fixture";

interface DataConnectionListEntry {
  id: string;
  name: string;
}

const tenant = loadTenantConfig();

describe("data-connection CLI integration", () => {
  testCiOnly("list returns JSON array", async () => {
    await withIntegrationFixture(tenant, async (fixture) => {
      // data-connection list
      const result = await fixture.runCli`
        observe data-connection list
      `;
      const connections = parseJsonOutput(result) as DataConnectionListEntry[];

      expect(Array.isArray(connections)).toBe(true);
      for (const connection of connections) {
        expect(typeof connection.id).toBe("string");
        expect(connection.id.length).toBeGreaterThan(0);
        expect(typeof connection.name).toBe("string");
      }
    });
  });
});
