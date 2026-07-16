import { run } from "@stricli/core";
import { app } from "./app.js";
import { buildContext } from "./context.js";
import { error } from "./lib/formatters/colors.js";
import { initUserAgent } from "./lib/user-agent.js";
import { withTelemetry } from "./lib/telemetry.js";
import { startBackgroundUpdateCheck } from "./lib/update-check.js";

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  await initUserAgent();

  const updateCheck = startBackgroundUpdateCheck(process.env);

  try {
    await withTelemetry(args, async (span) => {
      await run(app, args, buildContext(process, span));
      // `run` sets process.exitCode; surface it as the span's cli.exit_code.
      return typeof process.exitCode === "number" ? process.exitCode : 0;
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`${error("Error:")} ${message}\n`);
  } finally {
    const message = await updateCheck.getResult();
    if (message) {
      process.stderr.write(message + "\n");
    }
  }
}

void main();
