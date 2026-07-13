import { defineCommand } from "../../lib/stricli-wrappers";
import type { LocalContext } from "../../context";
import { setSkillName } from "../../lib/telemetry";

/**
 * `observe skill log-use <skill-name>` — records that an AI-agent skill was
 * used, for skill-usage telemetry.
 *
 * Hidden from `--help` (registered with `hideRoute` on the parent `skill` route
 * map) but runnable by anyone with no env var or auth. It only stamps
 * `cli.skill` onto the command span the telemetry wrapper already creates and
 * flushes — no API call. Best-effort: it never errors or exits non-zero, so a
 * failed telemetry attempt never disrupts the agent that invoked it.
 */
async function logUse(
  this: LocalContext,
  _flags: object,
  skillName: string,
): Promise<void> {
  setSkillName(skillName);
  this.writer.write(`Recorded use of skill "${skillName}".`);
}

export const logUseCommand = defineCommand({
  loader: async () => logUse,
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [
        {
          brief: "Skill name",
          parse: String,
        },
      ],
    },
    flags: {},
  },
  docs: {
    brief: "Record that a skill was used (telemetry)",
  },
});
