import { defineCommand } from "../../../lib/stricli-wrappers";
import chalk from "chalk";
import type { LocalContext } from "../../../context";
import { getActiveProfileName, loadAllProfiles } from "../../../lib/config";

export interface ProfileListDeps {
  loadAllProfiles?: typeof loadAllProfiles;
  getActiveProfileName?: typeof getActiveProfileName;
}

export async function profileList(
  this: LocalContext,
  flags: { json?: boolean },
  deps: ProfileListDeps = {},
): Promise<void> {
  const {
    loadAllProfiles: loadAllProfilesImpl = loadAllProfiles,
    getActiveProfileName: getActiveProfileNameImpl = getActiveProfileName,
  } = deps;
  const { writer } = this;

  const allProfiles = loadAllProfilesImpl();
  const profiles = Object.keys(allProfiles);
  const active = getActiveProfileNameImpl();

  if (flags.json) {
    const result = Object.fromEntries(
      profiles.map((name) => [
        name,
        {
          active: name === active,
          customerId: allProfiles[name]?.customerId,
          domain: allProfiles[name]?.domain,
        },
      ]),
    );
    writer.write(JSON.stringify(result, null, 2));
    return;
  }

  if (profiles.length === 0) {
    writer.info(
      "No profiles configured. Run 'observe auth login' to create one.",
    );
    return;
  }

  for (const name of profiles) {
    const cfg = allProfiles[name];
    const details = cfg ? chalk.dim(` (${cfg.customerId}.${cfg.domain})`) : "";
    if (name === active) {
      writer.write(chalk.green(`  * ${name}`) + details);
    } else {
      writer.write(`    ${name}` + details);
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
