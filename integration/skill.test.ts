import { describe, expect, test } from "bun:test";
import { existsSync, lstatSync, mkdirSync } from "node:fs";
import { join } from "node:path";
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

      // --user-defined: the API-created skill lives in the platform list, not
      // the bundled catalog that `skill list` now defaults to.
      const listResult = await fixture.runCli`
        observe skill list \
          --user-defined \
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
          --user-defined \
          --format json
      `;
      const viewed = parseJsonOutput(viewResult) as SkillViewJson;

      expect(viewed.id).toBe(created.id);
      expect(viewed.label).toBe(label);
      expect(viewed.description).toBe(created.description);

      // skill view --content: body matches what was saved.
      const contentResult = await fixture.runCli`
        observe skill view ${created.id} \
          --user-defined \
          --content
      `;

      expect(contentResult.stdout.trim()).toBe(content);
    });
  });

  test("install writes a bundled skill and symlinks it into a detected agent", async () => {
    await withIntegrationFixture(tenant, async (fixture) => {
      // Simulate Claude Code being installed by creating its config dir.
      mkdirSync(join(fixture.tempHome, ".claude"), { recursive: true });

      const result = await fixture.runCli`observe skill install generate-opal`;
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Installed 1 skill to ~/.agents/skills:");
      expect(result.stdout).toContain("generate-opal");

      // Canonical copy exists under the global skills store.
      const canonical = join(
        fixture.tempHome,
        ".agents/skills/generate-opal/SKILL.md",
      );
      expect(existsSync(canonical)).toBe(true);

      // Claude Code's skills dir receives a symlink into the canonical copy.
      const link = join(fixture.tempHome, ".claude/skills/generate-opal");
      expect(lstatSync(link).isSymbolicLink()).toBe(true);
    });
  });
});
