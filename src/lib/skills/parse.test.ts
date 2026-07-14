import { describe, expect, test } from "bun:test";
import { parseSkillMarkdown } from "./parse";

const SAMPLE = `---
name: generate-opal
description: >
  Contains dataset kind selection, column selection rules, and the skill
  index. NEVER generate OPAL without first loading this skill.
user-invocable: false
disable-model-invocation: true
---

# Core OPAL

Body content here.
`;

describe("parseSkillMarkdown", () => {
  test("maps frontmatter fields (folding the description) and body", () => {
    const parsed = parseSkillMarkdown(SAMPLE);
    expect(parsed.name).toBe("generate-opal");
    expect(parsed.description).toContain("dataset kind selection");
    // Folded `>` scalar joins its lines with spaces — no embedded newline.
    expect(parsed.description).not.toContain("\n");
    expect(parsed.userInvocable).toBe(false);
    expect(parsed.disableModelInvocation).toBe(true);
    expect(parsed.body).toContain("# Core OPAL");
    expect(parsed.raw).toBe(SAMPLE);
  });

  test('throws when the required "name" field is missing', () => {
    expect(() => parseSkillMarkdown(`---\ndescription: hi\n---\nbody`)).toThrow(
      '"name"',
    );
  });

  test('throws when the required "description" field is missing', () => {
    expect(() => parseSkillMarkdown(`---\nname: x\n---\nbody`)).toThrow(
      '"description"',
    );
  });
});
