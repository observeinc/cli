import type { CommandContext } from "@stricli/core";
import { createWriter, type Writer } from "./lib/writer.js";
import type { Span } from "./lib/telemetry.js";
import { setCommandSpanName } from "./lib/telemetry.js";

export interface LocalContext extends CommandContext {
  readonly process: NodeJS.Process;
  readonly writer: Writer;
}

export function buildContext(proc: NodeJS.Process, span?: Span) {
  return {
    process: proc,
    writer: createWriter({ process: proc }),
    // Called automatically by Stricli during routing, before the resolved command handler runs.
    forCommand({ prefix }: { prefix: readonly string[] }): LocalContext {
      setCommandSpanName(span, prefix.join("."));
      return { process: proc, writer: createWriter({ process: proc }) };
    },
  };
}
