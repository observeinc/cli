import { defineCommand } from "../../../lib/stricli-wrappers";
import chalk from "chalk";
import type { LocalContext } from "../../../context";
import { getActiveProfileName, listProfiles } from "../../../lib/config";

export interface ProfileListDeps {
  listProfiles?: typeof listProfiles;
  getActiveProfileName?: typeof getActiveProfileName;
}

export async function profileList(
  this: LocalContext,
  flags: { json?: boolean },
  deps: ProfileListDeps = {},
): Promise<void> {
  const {
    listProfiles: listProfilesImpl = listProfiles,
    getActiveProfileName: getActiveProfileNameImpl = getActiveProfileName,
  } = deps;
  const { writer } = this;

  const profiles = listProfilesImpl();
  const active = getActiveProfileNameImpl();

  if (flags.json) {
    writer.write(JSON.stringify({ profiles, active }, null, 2));
    return;
  }

  if (profiles.length === 0) {
    writer.info(
      "No profiles configured. Run 'observe auth login' to create one.",
    );
    return;
  }

  for (const name of profiles) {
    if (name === active) {
      writer.write(chalk.green(`  * ${name} (active)`));
    } else {
      writer.write(`    ${name}`);
    }
  }
}

export const profileListCommand = defineCommand({
  loader: async () => profileList,
  parameters: {
    flags: {
      json: {
        kind: "boolean",
        brief: "Output as JSON",
        optional: true,
      },
    },
  },
  docs: {
    brief: "List all profiles",
    fullDescription:
      "Lists all configured profiles and indicates which one is active.\n\n" +
      "Examples:\n" +
      "  observe auth profile list          # List profiles\n" +
      "  observe auth profile list --json   # Machine-readable output",
  },
});
