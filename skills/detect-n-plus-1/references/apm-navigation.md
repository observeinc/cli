# detect-n-plus-1 — APM navigation reference

How to use the Observe CLI's `observe apm …` commands to accelerate the [detect-n-plus-1](../SKILL.md) walk. These commands are **orientation accelerators** — they find the environment, the slow service, and the latency-dominant path fast. They **do not replace** the detection engine: the **unique-parent** `calls_per_invocation` **ratio sweep**, the **rule-out classification**, and **span** proof still decide, and all live in the drill-down OPAL ([opal-queries.md](opal-queries.md)) + spans.

## The experimental gate — and the OPAL fallback

The `observe apm …` commands are **experimental**: they are hidden and refuse to run unless `OBSERVE_CLI_EXPERIMENTAL=1` is set. Export it before any `observe apm` call:

```bash
export OBSERVE_CLI_EXPERIMENTAL=1
```

If the gate is unset in this build, or the `apm` subcommands aren't present, **fall back to the OPAL/dataset path** — the ratio sweep, rule-outs, and verdict never depend on these commands. Every orientation step below has an `observe query` equivalent; the drill-down OPAL always works. Pass `--json` on every command.

## The commands

| Capability                      | CLI command                             | Use it to                                                            |
| :------------------------------ | :-------------------------------------- | :------------------------------------------------------------------- |
| Environment / namespace list    | `observe apm environments`              | discover which environments + service namespaces exist (don't guess) |
| Service list (RED / p95)        | `observe apm services`                  | find the slow service(s); orient by p95 / error rate                 |
| Invocation graph (per-edge RED) | `observe apm invocation-graph`          | topology + which edge latency concentrates on; recurse hop-by-hop    |
| Dataset resolution (Setup)      | `observe dataset list` / `dataset view` | resolve the three Tracing datasets by exact label                    |

Full forms:

```bash
# Scope discovery — which environments/namespaces exist (fallback: read the
# service-metrics dataset per environment via observe query).
observe apm environments --interval <duration> --json

# Service RED — find the slow service(s). Sort values are the API orderBy set
# (serviceName, environment, serviceNamespace, invocationRatePerSecond,
# errorRatePerSecond, durationP95Seconds), each with a leading - for descending.
# Use the = form for dash values so the parser doesn't read - as short flags.
observe apm services --environment <env> [--service-namespace <ns>] \
  --sort=-durationP95Seconds --interval <duration> --json

# Invocation graph. Global mode: omit --service-name for the full graph.
# Focal mode: --service-name REQUIRES --environment; --endpoint-name and
# --direct-neighbors-only both REQUIRE --service-name.
observe apm invocation-graph --service-name <svc> --environment <env> \
  [--service-namespace <ns>] [--endpoint-name <ep>] [--direct-neighbors-only] \
  --interval <duration> --json

# Dataset resolution for the OPAL phases (exact label, never substring --label).
observe dataset list --filter 'label == "Tracing/Service Explorer Drilldown Metrics"' --json
observe dataset view <id> --json
```

`--interval` takes a **duration** (Entry ladder: `1h` → `4h` → `24h` → `3d` → `7d`); use `--start`/`--end` (ISO 8601) for an absolute window instead. `observe apm services` / `environments --json` return `{ interval, …, meta }` with rows under `services` / `environments`; `observe apm invocation-graph --json` returns `{ services, invocations, interval }` (per-edge metrics under `invocations`).

**What these commands do NOT give** (and the engine must supply): the **unique-parent-denominated** `calls_per_invocation` **ratio** (the N+1 signal). A _coarse_ pooled ratio **is** derivable — edge invocation-rate ÷ caller invocation-rate — and focal-endpoint mode (`--endpoint-name`) scopes the **edge rate (numerator)** to one endpoint, but there is **no per-endpoint caller-rate field** for the denominator (divide by the service-level rate — coarser still — or reconstruct it from the endpoint's inbound edge, which may be absent for an entry endpoint). Either way it lacks the **unique-parent denominator** (calls ÷ the distinct parent invocations that issued ≥ 1 call), so it averages over _all_ invocations and dilutes a conditionally-taken loop toward ~1. Also absent: the **downstream-operation (`span.name`) split** within an edge, the **completeness sweep** across every edge, the fine `service.kind` (E*HTTP/E_OTHER/INTERNAL/E_ASYNC*\*) + `avg_call_ms` the rule-outs need, and span-level proof. The invocation-graph's downstream **type** is only coarse too (`Service` / `Database` / `Messaging`) — enough to route Phase 4 vs 4b, not to classify or confirm.

## Navigation priority (per-edge latency)

1. **`observe apm invocation-graph`** — richest per-edge RED; shows each edge once (avoids the Phase 2a name/peer-IP twin). Use when available, and lean on it across the whole navigation: pick the latency-dominant edge, recurse hop-by-hop (`--service-name <downstream> --environment <env> --direct-neighbors-only`), and — via `--endpoint-name` on a _suspected_ endpoint — read that endpoint's **edge rate** (with a caller rate, a coarse calls/req — mind the denominator caveat above) to pre-rank suspects before you query OPAL. Read the structured `invocations[]` from `--json`, never a rendered diagram.
2. **Drill-down OPAL breakdown** (`observe query`, Phase 2a) — always works, and it is the only source of the **unique-parent** per-request ratio; the completeness ratio sweep + the verdict run here regardless of the `apm` commands. **A coarse graph ratio near ~1 does not rule out an N+1** — a single-endpoint fan-out dilutes when pooled, so the endpoint-granular sweep, not the graph, is the arbiter.

The CLI has no rendered service map; the invocation-graph command (structured edge data) and the OPAL edge breakdown are the topology sources — use those.

## The graph → verdict handoff

The invocation-graph identifies the **latency-dominant suspect edge**; it never confirms an N+1. For a flagged edge `A → B`, hand off to the drill-down (`observe query`):

- **`B` is a Database** → **Phase 4** with `leaf-service = A`, `database = B`, the environment (± namespace). The drill-down finds the calling endpoint + `calls_per_invocation`.
- **`B` is a Service** → **Phase 4b** with caller `A`, downstream service `B`. Read the **true-endpoint** row (`endpoint != operation`); the op-named twin collapses to ~1.0.
- **`B` is Messaging** (`E_ASYNC_*`) → not an N+1 (rule-out). A _producer_ emitting N messages/request is a fan-out analogue — flag and refer out.
- **Recurse:** if `B` is itself a slow service, re-run `observe apm invocation-graph --service-name B --environment <env> --direct-neighbors-only` to descend one hop (`service → downstream service → datastore`), tracking visited `(service, environment)` to avoid cycles.

Then **confirm** with the drill-down ratio (Phase 4/4b) and **prove** with spans (Phase 5). And regardless of which edge the graph highlights, still run the **ratio sweep across every edge** (Phase 0 / the Phase 2 completeness scan) — a cheap-per-call N+1 has low p95 and never surfaces in the graph's RED ranking.
