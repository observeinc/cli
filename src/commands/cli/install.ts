/**
 * CLI Install Command
 *
 * Configures shell integration: PATH modification.
 * When called with --move-binary, also handles binary placement.
 *
 * TODO: Add shell completion installation (bash, zsh, fish).
 * TODO: Add agent skill installation for AI coding assistants.
 */

import { defineCommand } from "../../lib/stricli-wrappers";
import { arch, platform } from "node:os";
import { dirname, join } from "node:path";
import type { LocalContext } from "../../context";
import { determineInstallDir, installBinary } from "../../lib/binary";
import { CURRENT_CLI_VERSION } from "../../lib/constants";
import { createWriter } from "../../lib/writer";
import { trace } from "@opentelemetry/api";
import {
  addToPath,
  addToGitHubPath,
  detectShell,
  buildPathExport,
  isInPath,
} from "../../lib/shell";
import { saveState } from "../../lib/state";

interface InstallFlags {
  "move-binary"?: boolean;
  method?: string;
  "no-modify-path"?: boolean;
  quiet?: boolean;
}

export async function install(
  this: LocalContext,
  flags: InstallFlags,
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

  let binaryDir = dirname(process.execPath);

  if (flags["move-binary"]) {
    const installDir = determineInstallDir({
      env: process.env,
      homeDir,
    });

    const dest = installBinary({
      sourcePath: process.execPath,
      installDir,
    });

    binaryDir = dirname(dest);
    writer.success(`Installed observe to ${dest}`);
  }

  let pathModified = false;

  if (!flags["no-modify-path"]) {
    try {
      const alreadyInPath = isInPath(binaryDir, process.env.PATH);

      if (alreadyInPath) {
        writer.info(`"${binaryDir}" already in $PATH`);
      } else if (shell.configFile) {
        const { modified, message, manualCommand } = await addToPath(
          shell.configFile,
          binaryDir,
          shell.type,
        );
        pathModified = modified;

        if (pathModified) {
          writer.success(message);
          writer.info(
            `  Restart your shell or run: source ${shell.configFile}`,
          );
        } else if (manualCommand) {
          writer.info(`PATH: ${message}`);
          writer.info(`  Run: ${manualCommand}`);
        } else {
          writer.info(`PATH: ${message}`);
        }
      } else {
        const cmd = buildPathExport(shell.type, binaryDir);
        writer.warn("No shell config file found");
        writer.info(`  Run: ${cmd}`);
      }

      const addedToGitHub = await addToGitHubPath(binaryDir, process.env);
      if (addedToGitHub) {
        writer.info("PATH: Added to $GITHUB_PATH");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      writer.error(`PATH modification failed: ${message}`);
    }
  }

  saveState({
    installedVersion: CURRENT_CLI_VERSION,
    installMethod: flags.method ?? "manual",
    installPath: flags["move-binary"]
      ? join(binaryDir, "observe")
      : process.execPath,
    installedAt: new Date().toISOString(),
    installOs: platform(),
    installArch: arch(),
  });

  if (flags["move-binary"] || pathModified) {
    writer.write("observe was installed successfully");
    writer.info("To get started, run:");
    writer.info("  observe auth login");
    writer.info("  observe --help");
  }

  const span = trace.getActiveSpan();
  if (span) {
    span.setAttributes({
      "cli.install.method": flags.method ?? "manual",
      "cli.install.path": flags["move-binary"]
        ? join(binaryDir, "observe")
        : process.execPath,
      "cli.install.moved_binary": flags["move-binary"] ?? false,
      "cli.install.path_modified": pathModified,
    });
  }
}

export const installCommand = defineCommand({
  loader: async () => install,
  parameters: {
    flags: {
      "move-binary": {
        kind: "boolean",
        brief:
          "Move the binary to the install directory (used by install script)",
        optional: true,
      },
      method: {
        kind: "parsed",
        parse: String,
        brief: "Installation method (curl, manual)",
        optional: true,
      },
      "no-modify-path": {
        kind: "boolean",
        brief: "Skip PATH modification",
        optional: true,
      },
      quiet: {
        kind: "boolean",
        brief: "Suppress output (for scripted usage)",
        optional: true,
      },
    },
  },
  docs: {
    brief: "Configure shell integration for the Observe CLI",
    fullDescription:
      "Sets up shell integration for the Observe CLI:\n\n" +
      "- Adds binary directory to PATH (if not already in PATH)\n" +
      "- With --move-binary, places the binary in the install directory\n\n" +
      "Without --move-binary, this command only configures PATH.\n" +
      "The install script (curl | bash) passes --move-binary automatically.\n\n" +
      "Examples:\n" +
      "  observe cli install                      # Configure PATH only\n" +
      "  observe cli install --move-binary        # Place binary + configure PATH\n" +
      "  observe cli install --no-modify-path     # Skip PATH modification",
  },
});
