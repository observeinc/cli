/**
 * Help Command
 *
 * Provides help information for the CLI.
 * - `observe help` or `observe` (no args): Shows branded help with banner
 * - `observe help <command>`: Shows Stricli's detailed help (--helpAll) for that command
 */

import { run } from "@stricli/core";
import { defineCommand } from "../lib/stricli-wrappers";
import type { LocalContext } from "../context.js";
import { printCustomHelp } from "../lib/help.js";

export const helpCommand = defineCommand({
  docs: {
    brief: "Display help for a command",
    fullDescription:
      "Display help information. Run 'observe help' for an overview, " +
      "or 'observe help <command>' for detailed help on a specific command.",
  },
  parameters: {
    flags: {},
    positional: {
      kind: "array",
      parameter: {
        brief: "Command to get help for",
        parse: String,
        placeholder: "command",
      },
    },
  },
  async func(
    this: LocalContext,
    _flags: Record<string, never>,
    ...commandPath: string[]
  ) {
    const { writer } = this;

    // No args: show branded help
    if (commandPath.length === 0) {
      await printCustomHelp(writer);
      return;
    }

    // With args: re-invoke with --helpAll to show full help including hidden items
    // Use dynamic imports to avoid circular dependency (app.ts imports helpCommand)
    const { app } = await import("../app.js");
    const { buildContext } = await import("../context.js");
    await run(app, [...commandPath, "--helpAll"], buildContext(this.process));
  },
});
