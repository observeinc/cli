---
name: detect-n-plus-1
description: "Root-cause a slow or high-latency service by decomposing where its time goes across downstream dependencies, recursing into the dominant downstream, and determining whether a downstream call pattern is an N+1 (many repeated per-request calls to a database or service — classic ORM/loop fan-out) or something else (slow query, high throughput, infrastructure saturation, messaging). Uses the APM per-endpoint drill-down metrics to break time down by downstream service, then operation, then endpoint, and confirms with the per-endpoint calls-per-invocation ratio plus real trace evidence, keeping false positives and false negatives low. Use when investigating a latency problem for a service — e.g. 'service X is slow', 'abnormal / high latency', a latency alert or breakdown pointing at database or downstream time, a 'chatty' / 'too many queries per request' database concern, or scanning services for the worst database / RPC fan-out."
user-invocable: false
---

# Detect N+1 Call Patterns

You are root-causing **latency** in a service. This skill decomposes where the service's time goes across its **downstream dependencies**, recurses into the dominant one, and determines whether a dependency's latency is an **N+1** — one request triggering many near-identical calls to a database or service (ORM-style one-query-per-row, or one call per list item) — or **something else** (slow query, throughput, saturation, a held-open stream, messaging). It aims for **low false-positive and low false-negative** rates.

This is the Observe CLI (`observe`) port of the detection playbook. It drives the `observe apm …` commands for orientation and `observe query` OPAL for the verdict.

**Two layers.** _Navigate_ with the `observe apm …` commands where available — the service list (RED/p95), the environment/namespace list, and the invocation-graph (per-edge RED) — to find the environment, the slow service, and the latency-dominant path fast ([APM navigation](references/apm-navigation.md)). Then _decide_ with the APM **per-endpoint drill-down metrics** via `observe query`: read the _time spent_ per downstream (total time, calls per request, avg time per call), following **downstream service → operation → endpoint** to real-trace confirmation. The `observe apm` commands give per-edge p95/RED and let you derive a coarse pooled ratio, but **no unique-parent per-request ratio**, so the drill-down **`calls_per_invocation` is the verdict**. Service p95 alone won't localize the cause — and a cheap-per-call N+1 ranks low by time/p95, so **scan the `calls_per_invocation` ratio on every edge regardless of time** (mandatory, drill-down-only, `observe query` only).

## Prerequisites — the experimental gate

The `observe apm …` commands are **experimental** and are hidden (and refuse to run) unless the experimental flag is set. Export it once before any `observe apm` call:

```bash
export OBSERVE_CLI_EXPERIMENTAL=1
```

**If the `apm` commands are unavailable** (flag not set in this build, or the subcommands aren't present), the OPAL/dataset path still yields the verdict — it always works. Every `observe apm` orientation step below has an `observe query` fallback, and the ratio sweep, rule-outs, and span proof never depend on the `apm` commands. Pass `--json` on every command that supports it.

## Entry — a latency symptom, no input gate

Do not gate on inputs. The trigger is a slow/high-latency service, or a request to find database or service fan-out — route by what you were given:

First **discover scope** with `observe apm environments --interval <duration> --json` (don't guess; fallback: read it from the service-metrics dataset per environment via `observe query`). Then route:

- **A service is named** → Phase 1 → Phase 2 → Phase 3 (recurse). **Environment optional**: if given, use it; else look the service up across its environments (per-env request rate + p95), drill into the worst-affected (ties → analyze each). Derive it from the data.
- **A namespace but no service** → a **namespace-scoped Phase 0** (rank that namespace's fan-out edges), then Phase 4 / Phase 4b on the top edges. Don't pick the focal service by p95 — that dead-ends on own-code/streaming; let the ratio scan choose. (Environment also given? scope Phase 0 to it too.)
- **Nothing named** → **Phase 0** (workspace-wide fan-out scan) → Phase 4 / Phase 4b on the top edges.

Do **not** rank candidates by p95 alone — the highest-p95 services are often own-code (`INTERNAL`) or held-open streams with no fan-out. p95 stays a _baseline symptom_ (Phase 1), not the ranking key.

> **Environment ≠ namespace.** Environment = `deployment.environment.name` (`production`, `staging`, `eng`) — the OTel attribute; the metric **tag column** key is `environment` (caller side: `parent.environment`). Never use `service.namespace` values as environments — different attribute, returns no data.

**Time window — narrow-first.** Use the user's window exactly if given. Otherwise widen only as needed: **1h → 4h → 24h → 3d → 7d**, stopping at the narrowest non-empty window with enough parent invocations (see `low_sample` in Phase 4). Both `observe query` and `observe apm …` take the window as `--interval <duration>` (`1h` → `4h` → `24h` → `3d` → `7d`); for an absolute window use `--start`/`--end` (ISO 8601).

Narrow-first matches the incident timeframe and avoids diluting a live problem with stale history; widen only to reach data or rule out a low-traffic fan-out. A wide window can surface a since-fixed N+1, so prefer the narrowest confident one. For a rare/bursty endpoint, widening adds no signal — drive load instead; a service under continuous load already has ample samples at 1h.

## OpenTelemetry data model context

- A **service** = (`service.name`, `deployment.environment.name`, `service.namespace`) — same name in two environments = two services. The **drill-down edge metrics** key each edge by the **calling** endpoint (caller = **parent**); three **Delta** metrics/edge (`sum(m(...))`) → **time per dep**, **calls/req**, **avg/call**. Downstream typed by **`service.kind`** — `DATABASE`, `E_HTTP`/`E_OTHER` (service/RPC), `E_ASYNC_CONSUMER`/`E_ASYNC_PRODUCER` (messaging), `INTERNAL` (own time); **no `"SERVICE"` kind** — named by `service.name`/`peer.db.name` (or `peer.server.address`), op `span.name`. Tag columns + metric names: _Setup_ + [OPAL reference](references/opal-queries.md#data-model--tag-paths).
- **`(self)` = own-time only when `service_kind = "INTERNAL"`.** A non-INTERNAL `(self)` (name unresolved) is a _real outbound call_ — identify by `span.name` + `peer.server.address`; never treat as own-code.

## Setup — resolve the datasets first

Every phase's OPAL binds to a specific dataset id, passed as `observe query --input <dataset-id>`. Resolve the three canonical `Tracing/…` datasets by **exact label**, then read the id from the result:

```bash
observe dataset list --filter 'label == "Tracing/Service Explorer Drilldown Metrics"' --json
observe dataset list --filter 'label == "Tracing/Service Metrics"' --json
observe dataset list --filter 'label == "Tracing/Span"' --json

observe dataset view <dataset-id> --json   # confirm schema/columns before binding
```

| Purpose (phases)                           | Exact dataset label                        | Confirm by                                               |
| :----------------------------------------- | :----------------------------------------- | :------------------------------------------------------- |
| Fan-out / time-spent metrics (0, 2, 4, 4b) | Tracing/Service Explorer Drilldown Metrics | metric `apm_service_edge_call_count_by_endpoint`         |
| Service RED baseline (Phase 1)             | Tracing/Service Metrics                    | metric `apm_service_call_count` / `apm_service_duration` |
| Span evidence (Phase 5)                    | Tracing/Span (the modeled dataset)         | columns `service_name` / `span_type` / `span_name`       |

These three are the **only** datasets this skill reads — resolve nothing else.

**Use `--filter 'label == "…"'` (exact CEL match), never `--label "…"` (substring).** The substring `--label "Tracing/Span"` also matches `Tracing/Span Raw` and personal "Copy of…" datasets; the exact CEL equality binds the one canonical dataset. Never hard-code a numeric tenant id, and never bind a "Copy of…" dataset.

**`observe content tracing view` is INSUFFICIENT here.** It returns `spanRawDatasetId` (the raw dataset Phase 5 must **not** use), gives no modeled-span id, and omits the drilldown + service-metrics datasets. For Phase 5 you must bind the **modeled** `Tracing/Span` (has `service_name` / `span_type` / `span_name` columns), never `Tracing/Span Raw` (a `resource_attributes.*` schema with no `service_name` — the Phase 5 queries error or return 0 rows against it).

**Reading command output.**

- `observe query --json` returns a **bare JSON array** of row objects (not the `{interval,…,meta}` envelope the `apm` commands use). Numeric `make_col` values come back as **strings**, so cast when comparing/sorting (e.g. `jq 'sort_by(.calls_per_invocation | tonumber)'`). Ignore the `align` artifacts `_c_bucket` / `valid_from` / `valid_to`. Nullable `make_col`s come back as real JSON `null` (not the string `"null"`) — e.g. `calls_per_invocation` when `parent_invocations = 0`, and INTERNAL `(self)` rows — so guard the cast (a null check, not a bare `tonumber`, which errors on null and can silently drop the exact 0-parent / low-sample rows you must keep and flag).
- `observe apm services` / `observe apm environments --json` return `{ interval, …, meta }` with the rows under `services` / `environments`. `observe apm invocation-graph --json` returns `{ services, invocations, interval }` (per-edge metrics under `invocations`, per-service RED under `services`).

The per-request ratio is:

```
calls_per_invocation = sum(m("apm_service_edge_call_count_by_endpoint"))
                     / sum(m("apm_service_edge_call_count_by_endpoint_unique"))
```

The denominator (`…_unique`) counts the **distinct parent invocations that issued ≥ 1 call on this edge**, so the ratio is calls ÷ the requests that used the edge (a loop endpoint on few requests has a small denominator).

Filter on the **mapped column** (`string(tags["…"])`), never a `#tag` key (it collapses the caller↔downstream distinction). Caller/downstream **tag-column paths**: [OPAL reference → Data model & tag paths](references/opal-queries.md#data-model--tag-paths).

## Is it N+1, or something else? — rule it out

A downstream dependency consuming time is **not** automatically N+1. Classify before flagging — this is what keeps false positives low:

| Pattern                         | Calls per request | Other signal                                                | Diagnosis                                                           |
| :------------------------------ | :---------------- | :---------------------------------------------------------- | :------------------------------------------------------------------ |
| **N+1 (DB or service)**         | >> 1              | total time scales with call count; same op repeated         | Many repeated per-request calls — batch them                        |
| **Slow query**                  | ~ 1               | high average time per call                                  | One expensive query, not fan-out                                    |
| **High throughput**             | ~ 1               | high total time, normal per-call time                       | Popular path behaving normally                                      |
| **Infra / DB saturation**       | ~ 1               | average time per call high and rising                       | Resource problem downstream, not fan-out                            |
| **Streaming / long-lived conn** | ~ 1               | avg time per call ≫ the caller's own p95 (held-open stream) | Connection lifetime, not per-request latency — exclude from ranking |
| **Messaging fan-out**           | n/a               | downstream is a _messaging_ system (`E_ASYNC_*`)            | Different downstream type; different fix                            |

Only **calls per request `>> 1`** — operationally **`≥ 1.5`** (Phase 2 / Severity) — is evidence of N+1. To keep **false negatives** low, walk every downstream dependency by time _and_ scan the ratio on every edge (a cheap-per-call N+1 ranks low by time), and recurse into slow downstream _services_ (a slow service may itself be slow because of its _own_ N+1). To keep **false positives** low, confirm a flagged edge with the per-endpoint ratio (Phase 4 / 4b) and real traces (Phase 5) before declaring N+1, and report what you ruled out. (Messaging nuance: a _producer_ emitting many messages per request — `E_ASYNC_PRODUCER`, named by its messaging destination/topic — is a fan-out analogue with a different fix; flag and refer it out. A consumer at ratio ≈ 1 is a healthy one-message-per-invocation worker.)

## Detection workflow

**Each phase pairs an `observe apm` command with an `observe query` OPAL pipeline: prefer the command for orientation** (scope, slow service, which edge to drill into, recursion), with OPAL the always-works fallback — **except** the **time-ranking** (Phase 2a), **ratio sweep** (0 / 2c), **confirms** (4 / 4b), and **span proof** (5), which run OPAL **by nature** (the graph only pre-orients — never rank by its p95; no `apm` command has total-time, the unique-parent ratio, or spans).

### Phase 0 — Workspace-wide fan-out scan (no service named)

**Objective**: with no service named, surface the worst fan-out edges directly — **by per-request ratio, not p95** (p95 ranking dead-ends on own-code/streaming).

`observe apm services` (RED/p95) and `observe apm invocation-graph` (global mode: omit `--service-name`) give fast orientation — which services are slow, the topology, even a derivable coarse ratio — but **no unique-parent per-request ratio**, so the **completeness sweep here is mandatory and drill-down-only** (`observe query`): scan every caller→downstream edge, compute `calls_per_invocation`, rank descending — carrying total time + volume so a high ratio on a trivial-time / low-volume edge is deprioritized, not dropped. Group by **calling endpoint** (`parent.span.name`) × **operation** (`span.name`); exclude `INTERNAL` own-time and op-named rows (`endpoint = operation`, ~1.0 — see Phase 4b). Scope by namespace when given. Use the Entry window ladder (start narrow).

```bash
observe query --input <drilldown-id> --pipeline '<Phase 0 OPAL>' \
  --interval 1h --limit 1000 --json
```

**Always pass `--limit 1000`** on the Phase 0 / 2c completeness sweeps — the default is 100 and will silently truncate a wide sweep.

→ **Query:** [OPAL reference → Phase 0 scan](references/opal-queries.md#phase-0--workspace-wide-fan-out-scan-no-service-named) — groups by `(parent_service, parent_env, parent_service_namespace, service_kind, endpoint, operation, downstream)`, excludes `INTERNAL` own-time and op-named rows (`endpoint = operation`), ranks by `calls_per_invocation`.

The top rows are the workspace's worst fan-out candidates. Take the top few — weighing ratio, total time, and volume together, not ratio alone — and confirm each with Phase 4 (database, `service_kind = DATABASE`) or Phase 4b (service, `E_HTTP`/`E_OTHER`): use the edge's `parent_service` as `<leaf-service>` (Phase 4) or `<service>` (Phase 4b), and its `downstream` / `operation` to name the target. **A top edge whose `service_kind` is `E_ASYNC_*` is a messaging producer** — route it to the messaging rule-out, not Phase 4/4b (which return empty for it). Flag `low_sample` rows as low-confidence, not disqualified; narrow the window if the workspace-wide scan is unwieldy. (Held-open streams sit at ratio ≈ 1 and rank near the bottom; classify them with the streaming guard (Phase 2a) — on this no-baseline route, confirm a suspected stream with a Phase 5 span check, not the op-name alone.)

### Phase 1 — Baseline (named service)

**Objective**: for a named service, record its RED metrics (request rate, error rate, p95) as the _symptom_ and identity — this confirms the service is actually slow and gives report context and the p95 the Phase 2a streaming guard compares against. It does **not** localize the cause; Phase 2's time-spent breakdown does that. (No service named? You're in Phase 0 — skip to confirming its top edges.)

- Get the service's RED from `observe apm services` (scope by environment ± namespace; order by p95):

  ```bash
  observe apm services --environment <env> --sort=-durationP95Seconds \
    --interval 1h --json
  # add --service-namespace <ns> to isolate one app; add --service-name <svc> for one row
  ```

  Sort values are the API `orderBy` set — `serviceName`, `environment`, `serviceNamespace`, `invocationRatePerSecond`, `errorRatePerSecond`, `durationP95Seconds`, each also with a leading `-` for descending. Use the `=` form for dash values (e.g. `--sort=-errorRatePerSecond`), so the parser doesn't read the `-` as short flags.

- **If the `apm` command is unavailable/flag-off, compute from the service-metrics dataset** (`Tracing/Service Metrics`, Setup) via `observe query`: throughput from `apm_service_call_count` (**delta** → `sum(m(...))`), p95 from `apm_service_duration` (**tdigest** → `histogram_combine` + `histogram_quantile`; **never `sum()` a tdigest**):

  → **Query:** [OPAL reference → Phase 1](references/opal-queries.md#phase-1--per-service-p95--throughput) (`apm_service_call_count` summed for throughput; `apm_service_duration` via `histogram_combine`/`histogram_quantile` for p95).

  This dataset spans **all namespaces** — scope by `service.namespace` to isolate one app. No environment given? It returns per environment; pick the worst-affected. No data? Widen the window (Entry ladder).

- **The invocation-graph is orientation only** (below the drill-down) — read its structured edge data from `observe apm invocation-graph --json`, never a rendered diagram; for p95/rate use `observe apm services` or the drill-down ([APM navigation](references/apm-navigation.md)).
- **Low-volume caveat:** a high p95 at a very low request rate (a handful of samples) is an extreme-tail artifact, not a reliable symptom — always note the request rate alongside p95.

### Phase 2 — Time-spent breakdown (the spine)

**Objective**: decompose the focal service's time across its downstream dependencies. Two operations: **(1) find the latency-dominant path** — rank downstreams by **total time** (2a below; the invocation-graph's per-edge p95 is fast orientation, not the ranking key) and recurse into the dominant one; **(2) the mandatory ratio sweep** — read `calls_per_invocation` at **endpoint × operation** granularity on **every** edge (**2c below**, drill-down only — _not_ the downstream-pooled 2a ratio, which hides a single-endpoint fan-out to a shared downstream) and flag any `≥ 1.5` regardless of time share, so a cheap-per-call N+1 isn't missed. The graph identifies the _suspect_ edge; the drill-down ratio + spans confirm.

> **The [OPAL reference](references/opal-queries.md) carries complete, runnable OPAL for every phase and its metric-dataset mechanics** (align-before-filter, `sum(m(...))`, ns→ms, ignore `align` artifacts). Read the `generate-opal` skill (`skills/generate-opal/SKILL.md`) and its `opal-*` references only to author OPAL beyond it. One skill-specific rule: add a `parent_service_namespace` group-by + post-`aggregate` filter when a namespace was given, to disambiguate same-named services.

**2a — Rank dependencies by total time** (group by **downstream only** — this is the _time_ ranking the walk acts on; its ratio is pooled per downstream, so **2c**, not 2a, is the completeness ratio sweep):

→ **Query:** [OPAL reference → Phase 2a breakdown](references/opal-queries.md#phase-2a--downstream-time-breakdown-named-service) — groups by **downstream only**, carries `pct_of_total` (sums to ~100 across rows) and the per-edge ratio, ranks by `total_duration`.

Each row is one dependency — a downstream service, a database (`peer.db.name`), an unresolved peer (`peer.server.address`), or `(self)` — with its `pct_of_total` share (0–100, summing to ~100). The **top row is the dominant time consumer**; Phase 3 acts on it. **A dominant `(self)` row is own-time only if `INTERNAL`** — a non-INTERNAL `(self)` is unresolved outbound calls; break it down by operation (`span.name`) before concluding own-code (Phase 4b does this). **One edge can appear twice** (a `service.name` row + a `peer.server.address` twin for the same call) — its `pct_of_total` double-counts, so trust the _ranking_, not the exact %. **The ratio can split too**: the name row may read ~1.0 while the twin carries the real `calls_per_invocation` — never clear an edge on the name row alone (Phase 4b's `coalesce` catches this).

> **Streaming guard.** Before recursing: `calls_per_invocation ≈ 1` **and** `avg_call_ms` ≫ the Phase 1 p95 — a per-request call can't outlast its request, so this is likely a held-open connection. **Confirm** with a stream operation-name (`*EventStream`, SSE, watch, subscribe, consumer poll): a slow _synchronous_ call also shows ratio ≈ 1 at high `avg_call_ms`, but that is slow-query / saturation, not streaming. **No Phase 1 baseline** (arrived via Phase 0)? The op-name is a hint, not proof — confirm with a **Phase 5 span check**: a held-open stream's span spans the trace/connection lifetime, not a per-request op. If a stream: classify _Streaming / long-lived conn_, exclude from the ranking, move on (note it, don't silently drop).

**2b — Drill the dominant dependency by operation**: re-run 2a, add `operation:string(tags["span.name"])` to the `group_by`, and post-`aggregate` filter to that downstream (e.g. a specific cache or SQL operation). `calls_per_invocation` here is a **hint only** (pooled across endpoints); the authoritative per-request ratio is Phase 4 (database) / Phase 4b (service).

**2c — Completeness ratio sweep (mandatory, endpoint-granular)**: 2a's downstream-pooled ratio hides a single-endpoint fan-out to a shared downstream (pooled ≈ 1 → missed). Run the **Phase 0 query scoped to this service** (`and parent_service = "<service>" and parent_env = "<environment>"`) — un-pooled per (endpoint, operation) — flag any `calls_per_invocation ≥ 1.5`, and confirm in Phase 4 / 4b. Pass `--limit 1000`. Catches the cheap-per-call N+1 that time/p95 ranking and 2a both miss.

### Phase 3 — Recurse / rule in-out

If you navigated via `observe apm invocation-graph`, it gives only a coarse downstream **type** (Service / Database / Messaging) to route — the rule-out classification (streaming, slow query, throughput, messaging) needs `service.kind` + `avg_call_ms` + the ratio, which the graph lacks, so **drop to the drill-down (Phase 2a/2b) before ruling out or recursing.** Handoff for a flagged edge `A→B`: **B a Database** → Phase 4 (`leaf-service = A`, `database = B`); **B a Service** → Phase 4b; **B Messaging** → rule-out. (See [APM navigation](references/apm-navigation.md).)

Recurse into a downstream _service_ by re-centering the graph on it:

```bash
observe apm invocation-graph --service-name <downstream-svc> --environment <env> \
  --direct-neighbors-only --interval 1h --json
```

Take the dominant time consumer from Phase 2a (skipping any edge the streaming guard excluded):

- **Downstream service** (`E_HTTP` / `E_OTHER`) → **recurse**: re-run Phase 2 with `parent.service.name` = that service, following the time through the call graph (`service → downstream service → datastore`) to the leaf. Also run **Phase 4b** on this service edge — a slow downstream service can itself be an RPC fan-out. Bound the recursion to ~3 hops; track the visited `(service, environment)` pairs to avoid cycles; when a chain is deep, prefer the branch that leads to a database.
- **Database** → read its per-operation ratio (Phase 2b) as a hint, then **confirm in Phase 4** (authoritative): `calls_per_invocation >> 1` → N+1 candidate; `~ 1` with high `avg_call_ms` → slow query; `~ 1` with normal per-call time but large total → throughput. (A cache/datastore is sometimes typed `E_OTHER` rather than `DATABASE` — a high-ratio `E_OTHER` datastore is caught by Phase 4b.) Report what you rule out.
- **Own code (`service_kind = INTERNAL`) dominates** → the service's own in-process time is the primary latency driver. **Never recurse into INTERNAL own-time** — it is not a downstream. But it does **not** mean fan-out is absent: still rule in/out every DATABASE (Phase 4) and service (Phase 4b) edge whose ratio `≥ 1.5` or time is material on the current service before concluding. For the own-code bottleneck itself, hand off to an internal-bottleneck investigation (a recent deployment regression, a client-side retry loop, or compute-bound code) — a different question from N+1.
- **A `(self)` / unnamed but NON-INTERNAL row dominates** → this is _not_ own-code; it is real outbound calls whose callee name wasn't resolved. Break it down by operation (`span.name`) + `peer.server.address` — Phase 4b does this (it groups by endpoint × operation and does not require `service.name`) — to reveal and confirm the fan-out.
- **Messaging / external** (`E_ASYNC_*`) → a different problem, not N+1 (see the messaging note above).

Phases 4 and 5 run against the **leaf** service + environment you reached by recursion — the parent of the flagged edge, **not** the original entry service.

### Phase 4 — Endpoint isolation + confirm (authoritative for a database)

**Objective**: on the **leaf** service from recursion, find the endpoint where the database time concentrates (often just one endpoint spikes), then confirm its true per-request ratio.

Re-run the breakdown for the leaf service + environment, scoped to the flagged database, grouped by the calling **endpoint** and operation (metrics selected in `align`; scoping done post-`aggregate`):

→ **Query:** [OPAL reference → Phase 4 DB confirm](references/opal-queries.md#phase-4--database-endpoint-confirm-authoritative-for-a-database) — groups by calling `endpoint` × `operation`, scoped to `service_kind = "DATABASE"` and the flagged `database`, ranked by `total_duration` (includes a peak-bucket sensitivity-check variant for bursty endpoints).

Ranked by time, the top row is the endpoint where this database's time concentrates; its `calls_per_invocation` is the **authoritative** per-request ratio — a high ratio there is the N+1 verdict. (Also flag any endpoint with `calls_per_invocation >> 1` even if it isn't the largest by time.) **Do not drop low-traffic rows.** Mark `low_sample` (`calls < 10`) as low-confidence and confirm in Phase 5 — but **flag it, never skip it**; a high ratio on a low-traffic endpoint is exactly the case this skill must catch. When `parent_invocations` is 0 (the caller lacks the unique-parent metric), the ratio is undefined — fall back to the Phase 5 per-trace count rather than treating it as no-fan-out.

**Confidence signals** (the ratio is primary; these raise confidence — none is required):

- **High call ratio** — `calls_per_invocation` well above 1 is the primary N+1 signal.
- **Same operation repeated** — the fan-out concentrates in one `(endpoint, database, operation)` row, not spread across many operations.
- **Peak-bucket ratio** (bursty/intermittent endpoint) — a transient N+1 dilutes in a pooled window; re-bucket finer than the window and take the **max** ratio (a high peak confirms an N+1 the window average hides — report both). Query + the `statsby`-not-`aggregate` gotcha: [OPAL ref → Phase 4](references/opal-queries.md#phase-4--database-endpoint-confirm-authoritative-for-a-database).
- **Low per-call variance** — corroborated by the Phase 5 span evidence (the same cheap query repeated).
- **Bimodal parent counts** — very different `parent_invocations` across one endpoint's operations (a loop op on far fewer parents than a fast op) flags distinct code paths; a low-count slow path is still a real N+1.

### Phase 4b — RPC / service-edge fan-out

**Objective**: catch the N+1 that lives on a **caller→service** edge, which the DB-only Phase 4 cannot see — a caller endpoint that issues one downstream RPC per list item, where each call may do exactly one clean DB query (every DB edge is then 1:1, so Phase 4 alone reports "not N+1"). Run this whenever Phase 0, Phase 2a, or Phase 3 flags a **service** downstream (`E_HTTP`/`E_OTHER`), independent of recursion depth.

**Read the metric correctly — the two representations.** The drill-down metric records a caller→service call under two rows: (1) keyed by the **true caller endpoint** (`parent.span.name` = the caller's own endpoint, `span.name` = the downstream operation) — this row's `calls_per_invocation` is the **real fan-out**; and (2) an **op-named** row where `parent.span.name = span.name` (the downstream op names both) — this row's ratio degenerates to **~1.0** and is useless. So: **group by `endpoint = parent.span.name` × `operation = span.name`, keep only rows where `endpoint != operation`, and do NOT require `service.name`** — the true-endpoint rows frequently have the callee name unresolved (they would otherwise be dropped as `(self)`).

→ **Query:** [OPAL reference → Phase 4b RPC fan-out](references/opal-queries.md#phase-4b--rpc--service-edge-fan-out) — groups by `endpoint` × `operation` × `downstream`, scoped to service edges (`E_HTTP`/`E_OTHER`), keeps only true-endpoint rows (`endpoint != operation`), does **not** require `service.name`, ranks by `calls_per_invocation`.

A `(endpoint, operation)` row with `calls_per_invocation >> 1` is an **RPC / service fan-out** (one downstream call per list item). Report it as an N+1 finding even when total time is small — it is still a DB-amplification pattern. **Name the target by its operation** (`span.name`, which encodes the service + method) when `service.name` is unresolved — `peer.server.address` may only be an IP. **Dual-row tie-break:** if both an op-named (~1.0) and a true-endpoint (>1) row exist for the same edge, report the **true-endpoint** row — the ~1.0 is the same edge double-represented, not a second finding. **If this true-endpoint query returns no rows for an edge flagged (Phase 2a / the graph) as a service downstream**, do not conclude "no fan-out" — the caller endpoint may be unresolved (all calls collapse into the op-named row); fall through to Phase 5 per-trace counting to confirm or clear it. **Phase 4b vs Phase 4:** use Phase 4b when the flagged downstream is a service, Phase 4 when it is a `DATABASE`; a service that itself fans out to a database is caught by recursing (Phase 3) then running Phase 4 on the leaf. Corroborate in Phase 5.

### Phase 5 — Span-level evidence (confirm in real traces)

**Objective**: prove the fan-out in real traces and (for a DB) surface the looping statement.

Use the **modeled span dataset** — **Tracing/Span** (`service_name`/`span_type`/`span_name`), resolved by exact label in Setup, **not** `Tracing/Span Raw`. **Empty ≠ ruled out:** check the row count is within an order of magnitude of the Phase 4/4b call count; if near-empty you're likely bound to the wrong dataset (raw instead of modeled) — re-check Setup and switch. An empty result can equally come from a **wrong string literal** (`span_type` casing, a `peer.db.name` / attribute name) — before trusting it, confirm the values exist with a quick `… | statsby count(), group_by(span_type)` (or the relevant attribute); a 0-row query from a bad literal is not evidence of "no N+1".

> Keep this scoped (filter to the operation/db, `limit` a few traces) so a wide-window raw-span scan stays well within the query execution timeout; span duration is nanoseconds, so convert before aggregating (`_ms`/`_sec`). `db.statement` is best-effort — null or redacted when the client isn't instrumented (expected for cache clients / drivers that don't capture statements); report the operation + per-trace count when it's absent.

**Read the exact operation name from `--json`, not the table.** Operation strings **truncate** in table view — a truncated name causes an empty span query and a false "no N+1." Pull the full `operation` / `span.name` string from the JSON rows of Phase 4 / 4b, then match spans with `contains(span_name, "<stable-substring>")`, not an eyeballed/exact truncated name. Downstream peers frequently resolve to an **IP under `peer.server.address`** rather than a service name, so name the target by its **operation** and match on a stable substring.

**Database edge** — count per-trace calls to the database and surface the statement:

→ **Query:** [OPAL reference → Phase 5 DB evidence](references/opal-queries.md#phase-5--database-edge-per-trace-calls--statement) — filter `service_name`, `span_type = "Remote call"`, `peer.db.name`; `count()` + `db.statement` per `trace_id`.

Scope by `peer.db.name` + `span_type = "Remote call"` (the operation string can differ between the metric tag `span.name` and the raw-span `span_name` — e.g. a cache command vs. `sql.conn.query` — so a `span_name` filter can return nothing; use it only as an optional refinement).

**Service (RPC) edge** — count the caller's per-trace calls of the fanned-out operation:

→ **Query:** [OPAL reference → Phase 5 RPC evidence](references/opal-queries.md#phase-5--service-rpc-edge-per-trace-calls) — filter the caller's `service_name`, `span_type = "Remote call"`, `contains(span_name, "<operation>")` (fallback `= "<operation>"` / `attributes["rpc.method"]`); `count()` per `trace_id`.

Each top trace should show a count ≈ the per-request ratio from Phase 4 / 4b — concrete proof of the loop. A per-trace count can legitimately **exceed** the pooled ratio when per-request cardinality varies (e.g. list or result-set size) — cardinality dilution of the pooled mean, not a contradiction, and distinct from the time-bucket dilution the peak-bucket check addresses. This step is **corroboration** for a DB edge (Phase 4 is the authoritative ratio) and the **decisive** check for an RPC edge whose metric rows look ambiguous; a low trace count means _insufficient evidence_, not _ruled out_. If the query is too heavy on a large window, do it in two passes: first `statsby count() group_by(trace_id) … limit 20` to find the loop, then pull `db.statement` on the top trace ids.

### Phase 6 — Severity

**Objective**: classify each confirmed edge.

Base severity on the **calls-per-request ratio**. **Escalate one band when the average time per call is high** (≥ 50 ms) at _any_ ratio — this is the key change from a ratio-only reading: a low-ratio loop of individually-slow calls is not benign. E.g. a Low-ratio loop (~3×) of individually slow (~200 ms) calls adds ~600 ms per request, which is operationally serious, not "Low". Total time spent is context (a huge ratio on a dependency that's 1% of the service's time matters less than a moderate one that's 80%). Bands are inclusive of their lower bound.

| Severity | Calls per request | Notes                                         |
| :------- | :---------------- | :-------------------------------------------- |
| Normal   | < 1.5             | One call per request, or simple batching      |
| Low      | 1.5 – 5           | Mild fan-out; may be acceptable at low volume |
| Medium   | 5 – 20            | Likely ORM over-fetch; investigate batching   |
| High     | 20 – 100          | Clear N+1; batching strongly recommended      |
| Critical | ≥ 100             | Severe fan-out                                |

Escalate one band when `avg_call_ms ≥ 50 ms` (e.g. Low → Medium, High → Critical; capped at Critical). **Band on the pooled ratio, but report the per-trace tail** (max calls/trace, Phase 5) — a pooled Low can hide a per-trace High (pooled ~3× but 7–10 calls in the worst trace). **A "Low" finding is still a real, batchable N+1** — don't read the table as "ignore below Medium." Thresholds are provisional (Beta); weigh total time and per-call latency when reporting.

### Before you conclude — self-check

Do not write the report until you can answer all four:

1. **Ratio confirmed?** Did you compute the per-endpoint `calls_per_invocation` in Phase 4 (DB) or Phase 4b (service) — for a service edge, from the **true-endpoint row** (`endpoint != operation`), corroborated by the Phase 5 per-trace count — not just the pooled Phase 2b hint?
2. **Traces corroborate?** Do Phase 5 traces show a per-trace call count ≈ the ratio (or did you explicitly mark the evidence insufficient / statement not instrumented)?
3. **Alternatives ruled out?** Is each non-N+1 dependency classified (slow query / high throughput / infra saturation / streaming / messaging / unresolved-callee)?
4. **Severity assigned?** With any `avg_call_ms ≥ 50 ms` escalation noted?

### Phase 7 — Report

Produce the findings for each confirmed edge (database via Phase 4, service via Phase 4b), **and** the edges you ruled out as not-N+1 (see [Report format](#report-format)).

## Things to NOT do

- Do not rank downstream dependencies by service p95 alone — rank by **total time spent** (the breakdown), and additionally scan the per-edge ratio; p95 won't tell you where the time goes.
- Do not stop at the loudest / top-time edge — a cheap-per-call N+1 ranks low by time, so run the endpoint-granular ratio sweep (Phase 2c) and flag any `calls_per_invocation ≥ 1.5` regardless of time share.
- Do not assume the symptom is N+1 — confirm with the calls-per-request ratio and rule out the alternatives (slow query, high throughput, infra saturation, streaming, messaging).
- Do not recurse into `INTERNAL` own-time; and do not treat a **non-INTERNAL** `(self)` / unnamed row as own-code — it is an unresolved downstream call (identify by operation + `peer.server.address`). Still check the current service's DB and service edges before concluding.
- Do not read the RPC fan-out ratio off the **op-named** row (`endpoint = operation`, ~1.0) — read the **true-endpoint** row (`endpoint != operation`), and don't drop unnamed downstream rows — **fan-out often hides there**. The same edge is labelled `(self)` in Phase 2a, `(unresolved)` in Phase 0/4b, or by db/service/op name elsewhere; a label change across phases is **not** a different edge.
- Do not **drop** low-traffic rows — mark `low_sample` / low-confidence and confirm in Phase 5; when `parent_invocations` is 0, fall back to the Phase 5 per-trace count.
- Do not pass `observe query` without `--limit 1000` on the Phase 0 / 2c sweeps — the default 100 silently truncates a wide sweep. And read numeric `make_col` values as strings (cast before comparing/sorting).
- Do not resolve datasets with `--label` (substring — matches `Tracing/Span Raw` and "Copy of…"); use `--filter 'label == "…"'`. Do not bind `spanRawDatasetId` from `observe content tracing view` for Phase 5.
- Do not invent service, environment, endpoint, database, or statement names — report only what the reads return.

## Known limitations

1. **Statement visibility depends on instrumentation.** The literal `db.statement` (Phase 5) is best-effort — null/redacted when the client isn't instrumented (common for cache clients); name the operation + per-trace count, not the exact SQL.
2. **Bounded recursion** (~3 hops). A deeper chain may not reach the leaf in one pass; report the partial path walked and note the truncation.
3. **Requires APM drill-down content + OPAL.** The `observe apm` commands additionally require `OBSERVE_CLI_EXPERIMENTAL=1`; if they're off, the OPAL/dataset path still yields the verdict. If APM content isn't installed or the tenant can't run OPAL, say so rather than guessing; resolve datasets by exact label (Setup).
4. **Window-bounded.** Results reflect the selected window (Entry ladder): wide history can surface a since-fixed N+1; a bursty one dilutes in a pooled window — use the peak-bucket check, drive load for low-volume bursts.

## Report format

```
### N+1 Latency Root-Cause Report

Scope:       <one service + environment | environment-wide scan | whole-map scan>
Time window: <window>
Path walked: <e.g. service-a → service-b → datastore, if recursion was used>

Confirmed N+1:
| Service (env)     | Endpoint   | Downstream (db/service) | Operation | Calls/req | Avg/call | % of svc time | Severity   | Confidence           |
| ----------------- | ---------- | ----------------------- | --------- | --------- | -------- | ------------- | ---------- | -------------------- |
| <service> (<env>) | <endpoint> | <db / service> | <op> | <ratio> | <ms> | <pct>% | <Severity> | <High / Low-sample> |

(Calls/req + Avg/call are the leaf service's endpoint values from Phase 4 / 4b; for a service edge, from
the true-endpoint row and corroborated by the Phase 5 per-trace count. % of svc time is the dependency's
pct_of_total from Phase 2a — optional on the Phase-0/namespace route (fill via a per-focal-service 2a
pass, or omit). Hedge it approximate when a peer.server.address twin inflates the denominator — trust
the ranking. The Service column is the leaf service reached by recursion. When the callee
name is unresolved, name the downstream by its operation. Ranked worst-first. Confidence is
Low-sample when the edge was low_sample (< 10 calls) or Phase 5 traces were sparse, else High.)

Evidence (sampled traces, Phase 5): worst trace makes <calls_in_trace> <op> calls to <downstream>;
statements: <db.statement values | "not instrumented">.

Ruled out (not N+1):
| Dependency        | Verdict         | Why                                                    |
| ----------------- | --------------- | ------------------------------------------------------ |
| <db/service (env)>| Slow query      | ratio ~1, high avg time per call — one expensive query |
| <db/service (env)>| High throughput | ratio ~1, normal per-call time — popular path          |
| <service (env)>   | Streaming       | ratio ~1, avg/call ≫ caller p95 — held-open connection |

Recommendation: Replace the per-item calls on <endpoint> with a single batched operation — a bulk
query (IN-list, JOIN, prefetch) for a database, or a bulk RPC (e.g. a GetMany([ids]) call) for a
service — to collapse ~<ratio> calls per request toward 1.

Note: statements come from the Phase 5 span evidence (db.statement); when the client isn't
instrumented, the operation + per-trace call count stand in for the exact SQL.
```
