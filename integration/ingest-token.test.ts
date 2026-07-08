import { describe, expect, test } from "bun:test";
import { deleteIngestToken } from "./cleanup";
import {
  loadTenantConfig,
  parseJsonOutput,
  testPrefix,
  withIntegrationFixture,
} from "./fixture";

interface IngestTokenJson {
  id: string;
  name: string;
  description?: string | null;
  disabled?: boolean;
  secret?: string;
}

const tenant = loadTenantConfig();

describe("ingest-token CLI integration", () => {
  test("create, list, view, and update", async () => {
    const prefix = testPrefix();
    const name = `${prefix}-ingest-token`;
    const description = "integration test token";

    await withIntegrationFixture(tenant, async (fixture) => {
      // ingest-token create
      const createResult = await fixture.runCli`
        observe ingest-token create \
          --name ${name} \
          --description ${JSON.stringify(description)}
      `;
      const created = parseJsonOutput(createResult) as IngestTokenJson;
      fixture.registerCleanup(() => deleteIngestToken(tenant, created.id));

      expect(typeof created.id).toBe("string");
      expect(created.id.length).toBeGreaterThan(0);
      expect(created.name).toBe(name);
      expect(created.secret).toBeDefined();

      // ingest-token list
      const listResult = await fixture.runCli`
        observe ingest-token list \
          --match ${prefix}
      `;
      const listed = parseJsonOutput(listResult) as IngestTokenJson[];

      expect(Array.isArray(listed)).toBe(true);
      expect(listed.some((token) => token.id === created.id)).toBe(true);
      expect(listed.some((token) => token.name === name)).toBe(true);

      // ingest-token view
      const viewResult = await fixture.runCli`
        observe ingest-token view ${created.id}
      `;
      const viewed = parseJsonOutput(viewResult) as IngestTokenJson;

      expect(viewed.id).toBe(created.id);
      expect(viewed.name).toBe(name);
      expect(viewed.description).toBe(description);

      // ingest-token update
      const updatedDescription = `${description} (updated)`;
      const updateResult = await fixture.runCli`
        observe ingest-token update ${created.id} \
          --description ${JSON.stringify(updatedDescription)}
      `;
      const updated = parseJsonOutput(updateResult) as IngestTokenJson;

      expect(updated.id).toBe(created.id);
      expect(updated.description).toBe(updatedDescription);

      // ingest-token view: update persisted
      const viewAfterUpdateResult = await fixture.runCli`
        observe ingest-token view ${created.id}
      `;
      const viewedAfterUpdate = parseJsonOutput(
        viewAfterUpdateResult,
      ) as IngestTokenJson;

      expect(viewedAfterUpdate.id).toBe(created.id);
      expect(viewedAfterUpdate.description).toBe(updatedDescription);

      // ingest-token update: disable token
      const disableResult = await fixture.runCli`
        observe ingest-token update ${created.id} \
          --disabled
      `;
      const disabled = parseJsonOutput(disableResult) as IngestTokenJson;

      expect(disabled.id).toBe(created.id);
      expect(disabled.disabled).toBe(true);

      // ingest-token view: disabled state persisted
      const viewAfterDisableResult = await fixture.runCli`
        observe ingest-token view ${created.id}
      `;
      const viewedAfterDisable = parseJsonOutput(
        viewAfterDisableResult,
      ) as IngestTokenJson;

      expect(viewedAfterDisable.disabled).toBe(true);

      // ingest-token update: re-enable token
      const enableResult = await fixture.runCli`
        observe ingest-token update ${created.id} \
          --no-disabled
      `;
      const enabled = parseJsonOutput(enableResult) as IngestTokenJson;

      expect(enabled.id).toBe(created.id);
      expect(enabled.disabled).toBe(false);

      // ingest-token view: enabled state persisted
      const viewAfterEnableResult = await fixture.runCli`
        observe ingest-token view ${created.id}
      `;
      const viewedAfterEnable = parseJsonOutput(
        viewAfterEnableResult,
      ) as IngestTokenJson;

      expect(viewedAfterEnable.disabled).toBe(false);
    });
  });
});
