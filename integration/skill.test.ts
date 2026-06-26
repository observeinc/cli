import { describe, expect, test } from "bun:test";
import {
  loadTenantConfig,
  parseJsonOutput,
  testPrefix,
  withIntegrationFixture,
} from "./fixture";
import { createTestSkill } from "./setup";

interface SkillListEntry {
  id: string;
  label: string;
  description?: string;
}

interface SkillViewJson {
  id: string;
  label: string;
  description?: string;
  content?: string;
}

const tenant = loadTenantConfig();

describe("skill CLI integration", () => {
  test("list and view an API-created skill", async () => {
    const prefix = testPrefix();
    const label = `${prefix}-skill`;
    const content = "# Integration test skill\n\nRun the test.";

    await withIntegrationFixture(tenant, async (fixture) => {
      // Seed a skill via API (not under test).
      const created = await createTestSkill(fixture, label, content);

      // skill list: client-side match filter finds the fixture.
      const listResult = await fixture.runCli`
        observe skill list \
          --format json \
          --match ${prefix}
      `;
      const listed = parseJsonOutput(listResult) as SkillListEntry[];

      expect(Array.isArray(listed)).toBe(true);
      expect(listed.some((skill) => skill.id === created.id)).toBe(true);
      expect(listed.some((skill) => skill.label === label)).toBe(true);

      // skill view: metadata reflects the saved skill.
      const viewResult = await fixture.runCli`
        observe skill view ${created.id} \
          --format json
      `;
      const viewed = parseJsonOutput(viewResult) as SkillViewJson;

      expect(viewed.id).toBe(created.id);
      expect(viewed.label).toBe(label);
      expect(viewed.description).toBe(created.description);

      // skill view --content: body matches what was saved.
      const contentResult = await fixture.runCli`
        observe skill view ${created.id} \
          --content
      `;

      expect(contentResult.stdout.trim()).toBe(content);
    });
  });
});
