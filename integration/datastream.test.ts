import { describe, expect, test } from "bun:test";
import { deleteDatastream } from "./cleanup";
import {
  INTEGRATION_TIMEOUT,
  loadTenantConfig,
  parseJsonOutput,
  testPrefix,
  withIntegrationFixture,
} from "./fixture";

interface DatastreamJson {
  id: string;
  name: string;
  description?: string | null;
  disabled?: boolean;
}

const tenant = loadTenantConfig();

describe("datastream CLI integration", () => {
  test(
    "create, list, view, and update",
    async () => {
      const prefix = testPrefix();
      const name = `${prefix}-datastream`;
      const description = "integration test datastream";

      await withIntegrationFixture(tenant, async (fixture) => {
        // datastream create
        const createResult = await fixture.runCli`
        observe datastream create \
          --name ${name} \
          --description ${JSON.stringify(description)}
      `;
        const created = parseJsonOutput(createResult) as DatastreamJson;
        fixture.registerCleanup(() => deleteDatastream(tenant, created.id));

        expect(typeof created.id).toBe("string");
        expect(created.id.length).toBeGreaterThan(0);
        expect(created.name).toBe(name);

        // datastream list
        const listResult = await fixture.runCli`
        observe datastream list \
          --match ${prefix}
      `;
        const listed = parseJsonOutput(listResult) as DatastreamJson[];

        expect(Array.isArray(listed)).toBe(true);
        expect(listed.some((ds) => ds.id === created.id)).toBe(true);
        expect(listed.some((ds) => ds.name === name)).toBe(true);

        // datastream view
        const viewResult = await fixture.runCli`
        observe datastream view ${created.id}
      `;
        const viewed = parseJsonOutput(viewResult) as DatastreamJson;

        expect(viewed.id).toBe(created.id);
        expect(viewed.name).toBe(name);
        expect(viewed.description).toBe(description);

        // datastream update
        const updatedDescription = `${description} (updated)`;
        const updateResult = await fixture.runCli`
        observe datastream update ${created.id} \
          --description ${JSON.stringify(updatedDescription)}
      `;
        const updated = parseJsonOutput(updateResult) as DatastreamJson;

        expect(updated.id).toBe(created.id);
        expect(updated.description).toBe(updatedDescription);

        // datastream view: update persisted
        const viewAfterUpdateResult = await fixture.runCli`
        observe datastream view ${created.id}
      `;
        const viewedAfterUpdate = parseJsonOutput(
          viewAfterUpdateResult,
        ) as DatastreamJson;

        expect(viewedAfterUpdate.id).toBe(created.id);
        expect(viewedAfterUpdate.description).toBe(updatedDescription);
      });
    },
    { timeout: INTEGRATION_TIMEOUT.graphRebuild },
  );
});
