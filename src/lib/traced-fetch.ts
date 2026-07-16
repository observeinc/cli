import {
  trace,
  context,
  propagation,
  SpanKind,
  SpanStatusCode,
} from "@opentelemetry/api";
import {
  ATTR_HTTP_REQUEST_METHOD,
  ATTR_HTTP_RESPONSE_STATUS_CODE,
  ATTR_SERVER_ADDRESS,
  ATTR_URL_FULL,
} from "@opentelemetry/semantic-conventions";
import { CURRENT_CLI_VERSION } from "./constants";

const TRACER_NAME = "observe-cli";

function serverAddress(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function looksLikeId(segment: string): boolean {
  return (
    /^\d+$/.test(segment) || // numeric id (dataset, monitor, ...)
    segment.includes(":") || // oid form, e.g. o:41007655
    /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(segment) // uuid
  );
}

/**
 * Low-cardinality span name for a request, e.g. "POST /v1/dataset/:id".
 *
 * Id-like path segments are collapsed to `:id` so per-id URLs don't explode the
 * set of span names, while still distinguishing one endpoint from another.
 */
function defaultSpanName(method: string, url: string): string {
  try {
    const route = new URL(url).pathname
      .split("/")
      .map((segment) => (looksLikeId(segment) ? ":id" : segment))
      .join("/");
    return `${method} ${route}`;
  } catch {
    return method;
  }
}

/**
 * `fetch` wrapper that records a CLIENT span for the request and injects W3C
 * trace context (traceparent/tracestate) into the outgoing headers, so the
 * Observe backend continues the CLI's trace instead of starting its own.
 *
 * When telemetry is disabled the global tracer and propagator are both no-ops,
 * so this behaves exactly like a bare `fetch` (no span, no injected headers).
 */
export async function tracedFetch(
  input: string | URL | Request,
  init?: RequestInit,
  { spanName }: { spanName?: string } = {},
): Promise<Response> {
  const method = (init?.method ?? "GET").toUpperCase();
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

  const tracer = trace.getTracer(TRACER_NAME, CURRENT_CLI_VERSION);

  return tracer.startActiveSpan(
    spanName ?? defaultSpanName(method, url),
    {
      kind: SpanKind.CLIENT,
      attributes: {
        [ATTR_HTTP_REQUEST_METHOD]: method,
        [ATTR_URL_FULL]: url,
        [ATTR_SERVER_ADDRESS]: serverAddress(url),
      },
    },
    async (span) => {
      // Inject from inside the CLIENT span so the backend links under it.
      const headers = new Headers(init?.headers);
      propagation.inject(context.active(), headers, {
        set: (carrier, key, value) => carrier.set(key, value),
      });

      try {
        const response = await fetch(input, { ...init, headers });
        span.setAttribute(ATTR_HTTP_RESPONSE_STATUS_CODE, response.status);
        span.setStatus({
          code: response.ok ? SpanStatusCode.OK : SpanStatusCode.ERROR,
        });
        return response;
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
      }
    },
  );
}
