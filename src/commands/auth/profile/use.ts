import { defineCommand } from "../../../lib/stricli-wrappers";
import type { LocalContext } from "../../../context";
import { setCurrentProfile } from "../../../lib/config";

export interface ProfileUseDeps {
  setCurrentProfile?: typeof setCurrentProfile;
}

export async function profileUse(
  this: LocalContext,
  _flags: Record<string, never>,
  name: string,
  deps: ProfileUseDeps = {},
): Promise<void> {
  const { setCurrentProfile: setCurrentProfileImpl = setCurrentProfile } = deps;
  const { process, writer } = this;

  try {
    setCurrentProfileImpl(name);
    writer.success(`Switched to profile "${name}".`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    writer.error(message);
    process.exitCode = 1;
  }
}

export const profileUseCommand = defineCommand({
  loader: async () => profileUse,
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [
        {
          brief: "Profile name to switch to",
          parse: String,
        },
      ],
    },
    flags: {},
  },
  docs: {
    brief: "Switch the active profile",
    fullDescription:
      "Sets the active profile for subsequent commands.\n\n" +
      "Examples:\n" +
      "  observe auth profile use staging      # Switch to staging profile\n" +
      "  observe auth profile use production   # Switch to production profile",
  },
});
