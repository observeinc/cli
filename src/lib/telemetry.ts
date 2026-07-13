import type { Span } from "@opentelemetry/api";
import { CURRENT_CLI_VERSION, TELEMETRY_TOKEN, COLLECT_URL } from "./constants";
import { configExists, loadConfig } from "./config";
import { getInstallId } from "./state";
import { OBSERVE_CALLER, detectSessionId } from "./user-agent";
import {
  ATTR_OS_TYPE,
  ATTR_HOST_ARCH,
  ATTR_OS_VERSION,
} from "@opentelemetry/semantic-conventions/incubating";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";

export type { Span } from "@opentelemetry/api";

const SERVICE_NAME = "observe-cli";

const SENSITIVE_FLAGS = new Set([
  "--token",
  "--password",
  "--secret",
  "--key",
  "--api-key",
  "--gql-token",
]);

/**
 * Derive a command-path span name from raw argv (e.g. "tag-value.list").
 *
 * Stricli only tells us the resolved route via the `forCommand` context
 * builder, which it skips when it short-circuits to print help or a route
 * group's usage. In those cases the span would otherwise keep a generic name,
 * so we approximate the command path from the leading route-shaped tokens. On
 * a normal run `setCommandSpanName` overrides this with the exact route prefix.
 *
 * We stop at the first token that isn't a route segment (a flag, or a
 * positional value like an id) so values never leak into the span name and
 * inflate its cardinality — every route/command in this CLI is lowercase-kebab.
 */
export function commandNameFromArgv(argv: string[]): string {
  const path: string[] = [];
  for (const token of argv) {
    if (!/^[a-z][a-z0-9-]*$/.test(token)) break;
    path.push(token);
  }
  return path.length > 0 ? path.join(".") : "cli";
}

export function redactArgv(argv: string[]): string[] {
  const result: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === undefined) continue;
    const eqIdx = arg.indexOf("=");
    if (eqIdx !== -1 && SENSITIVE_FLAGS.has(arg.slice(0, eqIdx))) {
      result.push(`${arg.slice(0, eqIdx)}=<REDACTED>`);
      continue;
    }
    if (SENSITIVE_FLAGS.has(arg) && i + 1 < argv.length) {
      result.push(arg, "<REDACTED>");
      i++;
      continue;
    }
    result.push(arg);
  }
  return result;
}

let provider:
  | import("@opentelemetry/sdk-trace-node").NodeTracerProvider
  | null = null;

export function isTelemetryEnabled() {
  return !!(TELEMETRY_TOKEN && COLLECT_URL);
}

async function initTracing() {
  if (provider) return;
  if (!isTelemetryEnabled()) return;

  const [
    { platform, arch, release },
    { resourceFromAttributes },
    { NodeTracerProvider },
    { BatchSpanProcessor },
    { OTLPTraceExporter },
  ] = await Promise.all([
    import("node:os"),
    import("@opentelemetry/resources"),
    import("@opentelemetry/sdk-trace-node"),
    import("@opentelemetry/sdk-trace-base"),
    import("@opentelemetry/exporter-trace-otlp-http"),
  ]);

  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: SERVICE_NAME,
    [ATTR_SERVICE_VERSION]: CURRENT_CLI_VERSION,
    [ATTR_OS_TYPE]: platform(),
    [ATTR_HOST_ARCH]: arch(),
    [ATTR_OS_VERSION]: release(),
    "cli.install_id": getInstallId(),
  });

  const exporter = new OTLPTraceExporter({
    url: `${COLLECT_URL}/v2/otel/v1/traces`,
    headers: {
      Authorization: `Bearer ${TELEMETRY_TOKEN}`,
      "X-Observe-Target-Package": "Tracing",
    },
    timeoutMillis: 3000,
  });

  provider = new NodeTracerProvider({
    resource,
    spanProcessors: [new BatchSpanProcessor(exporter)],
  });

  provider.register();
}

function resourceAttributes() {
  const attrs: Record<string, string> = {};
  try {
    if (!configExists()) {
      return attrs;
    }

    const config = loadConfig();
    attrs["observe.customer_id"] = config.customerId;
    attrs["observe.domain"] = config.domain;
  } catch {
    // Config may be invalid -- don't let it break telemetry
  }
  return attrs;
}

/**
 * Build the host-agent span attributes: `cli.caller` and, when present,
 * `cli.caller_session_id`. Missing values are omitted; never throws. Pure in
 * its inputs so it stays deterministic and testable (see withTelemetry).
 */
export function identityAttributes(
  caller: string | undefined,
  sessionId: string | undefined,
): Record<string, string> {
  const attrs: Record<string, string> = {};
  if (caller) {
    attrs["cli.caller"] = caller;
  }
  if (sessionId) {
    attrs["cli.caller_session_id"] = sessionId;
  }
  return attrs;
}

/**
 * Wrap the entire CLI execution in a single root span.
 *
 * Initialises OTel on first call, creates one root span for the full
 * invocation, and attaches argv plus environment metadata as attributes. The
 * span is kind SERVER so Observe treats it as the trace's service entry point,
 * and is named from argv up front (see `commandNameFromArgv`) so it still
 * carries a meaningful name when Stricli short-circuits to help. The span is
 * passed into the callback so the Stricli context can rename it to the exact
 * resolved command path once routing completes.
 *
 * If the callback returns a number it is recorded as `cli.exit_code` and drives
 * the span status (non-zero => error); command failures surface this way rather
 * than by throwing.
 *
 * After the callback finishes (or throws), the provider is shut down
 * so all buffered spans are flushed before the process exits.
 */
export async function withTelemetry<T>(
  argv: string[],
  callback: (span: Span | undefined) => T | Promise<T>,
) {
  if (!isTelemetryEnabled()) {
    return callback(undefined);
  }

  await initTracing();

  const { trace, SpanStatusCode, SpanKind } =
    await import("@opentelemetry/api");
  const tracer = trace.getTracer(SERVICE_NAME, CURRENT_CLI_VERSION);
  const attrs = resourceAttributes();
  const commandName = commandNameFromArgv(argv);

  return tracer.startActiveSpan(
    commandName,
    {
      kind: SpanKind.SERVER,
      attributes: {
        ...attrs,
        ...identityAttributes(OBSERVE_CALLER, detectSessionId()),
        "cli.command": commandName,
        "cli.argv": redactArgv(argv).join(" "),
        "cli.version": CURRENT_CLI_VERSION,
      },
    },
    async (span) => {
      try {
        const result = await callback(span);
        if (typeof result === "number") {
          span.setAttribute("cli.exit_code", result);
          span.setStatus({
            code: result === 0 ? SpanStatusCode.OK : SpanStatusCode.ERROR,
          });
        } else {
          span.setStatus({ code: SpanStatusCode.OK });
        }
        return result;
      } catch (err) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: err instanceof Error ? err.message : String(err),
        });
        span.recordException(
          err instanceof Error ? err : new Error(String(err)),
        );
        throw err;
      } finally {
        span.end();
        await shutdownTracing();
      }
    },
  );
}

async function shutdownTracing() {
  if (!provider) return;
  try {
    await provider.forceFlush();
    await provider.shutdown();
  } catch {
    // Telemetry shutdown failures are silently ignored
  } finally {
    provider = null;
  }
}

/**
 * Set the resolved command name on the active span.
 *
 * Called from the Stricli forCommand context builder once routing is
 * complete so the span carries the actual command path (e.g. "dataset.list")
 * instead of the argv-derived approximation. A blank prefix (the top-level
 * default command) is left as-is so we keep the up-front name.
 */
export function setCommandSpanName(span: Span | undefined, command: string) {
  if (span && command) {
    span.updateName(command);
    span.setAttribute("cli.command", command);
  }
}
