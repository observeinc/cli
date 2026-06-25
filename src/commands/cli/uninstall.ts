import { defineCommand } from "../../lib/stricli-wrappers";
import type { LocalContext } from "../../context";
import { createWriter } from "../../lib/writer";
import { detectShell, removeObserveBlocks } from "../../lib/shell";

interface UninstallFlags {
  quiet?: boolean;
}

async function uninstall(
  this: LocalContext,
  flags: UninstallFlags,
): Promise<void> {
  const { process } = this;
  const writer = flags.quiet
    ? createWriter({ process, quiet: true })
    : this.writer;
  const homeDir = process.env.HOME ?? process.env.USERPROFILE ?? "";
  const shell = detectShell(
    process.env.SHELL,
    homeDir,
    process.env.XDG_CONFIG_HOME,
  );

  if (shell.configFile) {
    const removed = removeObserveBlocks(shell.configFile);
    if (removed > 0) {
      writer.success(
        `Removed ${removed} observe block(s) from ${shell.configFile}`,
      );
      writer.info(`  Restart your shell or run: source ${shell.configFile}`);
    } else {
      writer.info(`No observe entries found in ${shell.configFile}`);
    }
  } else {
    writer.info("No shell config file found — nothing to remove");
  }

  writer.success("Uninstall complete.");
}

export const uninstallCommand = defineCommand({
  loader: async () => uninstall,
  parameters: {
    flags: {
      quiet: {
        kind: "boolean",
        brief: "Suppress output (for scripted usage)",
        optional: true,
      },
    },
  },
  docs: {
    brief: "Remove shell integration for the Observe CLI",
    fullDescription:
      "Removes shell integration previously set up by 'observe cli setup':\n\n" +
      "- Removes PATH entries from shell config\n\n" +
      "Examples:\n" +
      "  observe cli uninstall          # Remove all shell integration\n" +
      "  observe cli uninstall --quiet  # Silent mode",
  },
});
