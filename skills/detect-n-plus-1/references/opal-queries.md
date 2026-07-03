# detect-n-plus-1 — OPAL query reference

Runnable OPAL for each phase of the [detect-n-plus-1](../SKILL.md) playbook. Bind datasets **by exact label** (see the skill's _Setup_); fill the `<service>`, `<environment>`, `<namespace>`, `<database>`, `<operation>`, `<leaf-service>`, `<caller-service>` placeholders from the prior phase.

Metric-dataset rules: **never `filter` before `align`**; the Delta edge/service metrics are read with `sum(m(...))` (the one exception — Phase 1's `apm_service_duration` tdigest — is noted there); durations are nanoseconds — convert to `_ms`; `_c_bucket` / `valid_from` / `valid_to` are `align` artifacts — ignore them. These queries are complete and runnable as-is; read the `generate-opal` skill (`skills/generate-opal/SKILL.md`) and its `opal-*` references only to author OPAL beyond them.

**Running these with the Observe CLI.** Each pipeline runs on a **single primary input** — the bound dataset. Resolve the dataset id by exact label (Setup) and pass it as the sole `--input`; the leading `align` / `filter` operates on that input implicitly (these single-dataset pipelines carry no explicit `@input` reference):

```bash
observe query --input <dataset-id> --pipeline '<opal>' --interval <window> --limit 1000 --json
```

Pass the Entry **window ladder** value explicitly as `--interval` (`1h` → `4h` → `24h` → `3d` → `7d`) — the ladder is this skill's method, so specifying it is correct. **Always pass `--limit 1000`** on the Phase 0 / 2c completeness sweeps; the default is 100 and silently truncates a wide sweep. `observe query --json` returns a **bare JSON array** of row objects (not an `{interval,…,meta}` wrapper), and numeric `make_col` values come back as **strings** — cast before comparing/sorting.

## Data model & tag paths

Each edge dimension lives in the `tags` object and maps **both** the caller and downstream side to the same tag — so filter on the **mapped column** (`string(tags["…"])`), never a `#tag` correlation key (`#service.name` would match either side and destroy the caller↔downstream distinction). Confirm paths from the dataset's `correlationTagMappings` (in `observe dataset view <id> --json`) if unsure — but note `tags` is free-form and carries keys that are **not** declared correlation tags: `service.kind` (the routing key used throughout below) is read via `string(tags["service.kind"])` and will not appear in `correlationTagMappings`, so its absence from that list does **not** mean it is unavailable.

| Dimension            | Caller-side column                            | Downstream-side column              |
| :------------------- | :-------------------------------------------- | :---------------------------------- |
| service              | `tags["parent.service.name"]`                 | `tags["service.name"]`              |
| environment          | `tags["parent.environment"]`                  | `tags["environment"]`               |
| namespace            | `tags["parent.service.namespace"]`            | `tags["service.namespace"]`         |
| operation / endpoint | `tags["parent.span.name"]` (calling endpoint) | `tags["span.name"]` (downstream op) |
| database             | —                                             | `tags["peer.db.name"]`              |
| unresolved peer      | —                                             | `tags["peer.server.address"]`       |

The downstream is typed by `service.kind` (read as `coalesce(string(tags["service.kind"]), "INTERNAL")`): `DATABASE`, `E_HTTP`/`E_OTHER` (service/RPC), `E_ASYNC_CONSUMER`/`E_ASYNC_PRODUCER` (messaging), or `INTERNAL` (own in-process time). Scope a query to one app by the **caller-side** namespace (`parent.service.namespace`), not the downstream `service.namespace`.

## Edge metrics — dataset **Tracing/Service Explorer Drilldown Metrics**

The four edge queries share one skeleton — three Delta metrics selected in `align`, summed in `aggregate`, ratios in `make_col` — and differ only in the **group_by** dimensions, the post-`aggregate` **filter**, and the **sort**. Read the per-request ratio as `calls_per_invocation = calls / parent_invocations`.

**Read results by column header, not position:** `avg_call_ms` (mean ms _per call_) renders next to `calls_per_invocation` (the _per-request ratio_) — don't read the avg as the ratio. The **column set also shifts between phases** (each phase's `group_by` can differ — e.g. Phase 4 carries a `database` column where Phase 0/4b carry `downstream`, and Phase 2a adds `pct_of_total`), so position-based reading breaks phase-to-phase, not just within a row.

### Phase 0 — workspace-wide fan-out scan (no service named)

Group by calling endpoint × operation; exclude `INTERNAL` own-time and op-named rows (`endpoint = operation`, which read ~1.0); rank by ratio.

```opal
align options(bins: 1),
    duration_sum:sum(m("apm_service_edge_duration_sum_by_endpoint")),
    calls:sum(m("apm_service_edge_call_count_by_endpoint")),
    parent_invocations:sum(m("apm_service_edge_call_count_by_endpoint_unique"))
aggregate
    total_duration:sum(duration_sum), calls:sum(calls), parent_invocations:sum(parent_invocations),
    group_by(
        parent_service:string(tags["parent.service.name"]),
        parent_env:string(tags["parent.environment"]),
        parent_service_namespace:string(tags["parent.service.namespace"]),
        service_kind:coalesce(string(tags["service.kind"]), "INTERNAL"),
        endpoint:string(tags["parent.span.name"]),
        operation:string(tags["span.name"]),
        downstream:coalesce(string(tags["peer.db.name"]), string(tags["service.name"]), string(tags["peer.server.address"]), "(unresolved)"))
filter calls > 0 and service_kind != "INTERNAL" and endpoint != operation
    // and parent_env = "<environment>"               // scope by env when given (Entry env / env+namespace route)
    // and parent_service_namespace = "<namespace>"   // scope by namespace only when given (else workspace-wide)
make_col
    calls_per_invocation: if(parent_invocations > 0, calls / float64(parent_invocations), float64_null()),
    avg_call_ms: float64(total_duration) / float64(calls) / 1000000.0,
    total_time_ms: float64(total_duration) / 1000000.0,
    low_sample: calls < 10 or parent_invocations = 0
sort desc(calls_per_invocation), desc(total_time_ms)
```

### Phase 2a — downstream time breakdown (named service)

Group by downstream only; carries `pct_of_total` (sums to ~100 across rows) and the per-edge ratio; rank by total time.

```opal
align options(bins: 1),
    duration_sum:sum(m("apm_service_edge_duration_sum_by_endpoint")),
    calls:sum(m("apm_service_edge_call_count_by_endpoint")),
    parent_invocations:sum(m("apm_service_edge_call_count_by_endpoint_unique"))
aggregate
    total_duration:sum(duration_sum), calls:sum(calls), parent_invocations:sum(parent_invocations),
    group_by(
        parent_service:string(tags["parent.service.name"]),
        parent_env:string(tags["parent.environment"]),
        parent_service_namespace:string(tags["parent.service.namespace"]),
        service_kind:coalesce(string(tags["service.kind"]), "INTERNAL"),
        downstream:coalesce(string(tags["peer.db.name"]), string(tags["service.name"]), string(tags["peer.server.address"]), "(self)"))
filter parent_service = "<service>" and parent_env = "<environment>"
    // and parent_service_namespace = "<namespace>"   // add when a namespace was given
make_col
    calls_per_invocation: if(parent_invocations > 0, calls / float64(parent_invocations), float64_null()),
    pct_of_total: 100.0 * total_duration / window(sum(total_duration), group_by(parent_service, parent_env)),
    avg_call_ms: float64(total_duration) / float64(calls) / 1000000.0,
    total_time_ms: float64(total_duration) / 1000000.0
filter calls > 0
sort desc(total_duration)
```

_2b (drill by operation):_ re-run this with `operation:string(tags["span.name"])` added to the `group_by` and a post-`aggregate` filter to the dominant downstream. The ratio here is a **hint** (pooled across endpoints); the authoritative per-request ratio is Phase 4 (DB) / Phase 4b (service).

_Completeness ratio sweep (named service):_ Phase 2a is grouped by downstream **only**, so its ratio is pooled across endpoints and dilutes a single-endpoint fan-out to a shared/popular downstream (one endpoint calling a DB 50×/req, averaged against many 1:1 callers → pooled ≈ 1). For the mandatory per-request sweep, run the **Phase 0 query** with `and parent_service = "<service>" and parent_env = "<environment>"` added to its post-`aggregate` filter — that yields the un-pooled `calls_per_invocation` per `(endpoint, operation)` for this service; flag any `≥ 1.5` and confirm in Phase 4 / 4b. Phase 2a stays the time-ranking spine. (A 0-parent edge — unique-parent metric missing — now surfaces with a null ratio, ranked by time and marked `low_sample`, so it isn't dropped; confirm it via the Phase 5 per-trace fallback.)

_Twin dedup (name vs peer-IP):_ one edge can be recorded as both a `service.name` row **and** a `peer.server.address` (IP) row for the same call — near-identical `calls` / `parent_invocations` / duration. That's the _same_ edge double-labelled, not two downstreams, so it **double-counts**: each row's `pct_of_total` is deflated _and_ the shared denominator is inflated (summing the two shares **overstates** the true share). There's no clean merge key — the rows also carry different `span.name` strings (a gRPC-style one vs a `POST /…` one), so re-grouping by operation won't collapse them. So treat the edge's weight as ~**one** row's `total_duration` (it's the same dominant edge either way), the `pct` as approximate, and **trust the ranking**; resolve the IP to its service out-of-band if you need one clean labelled row.

### Phase 4 — database endpoint confirm (authoritative for a database)

Group by calling endpoint × operation; scope to `service_kind = "DATABASE"` and the flagged database; rank by total time. The top row's `calls_per_invocation` is the authoritative N+1 verdict.

```opal
align options(bins: 1),
    duration_sum:sum(m("apm_service_edge_duration_sum_by_endpoint")),
    calls:sum(m("apm_service_edge_call_count_by_endpoint")),
    parent_invocations:sum(m("apm_service_edge_call_count_by_endpoint_unique"))
aggregate
    total_duration:sum(duration_sum), calls:sum(calls), parent_invocations:sum(parent_invocations),
    group_by(
        parent_service:string(tags["parent.service.name"]),
        parent_env:string(tags["parent.environment"]),
        parent_service_namespace:string(tags["parent.service.namespace"]),
        service_kind:coalesce(string(tags["service.kind"]), "INTERNAL"),
        database:coalesce(string(tags["peer.db.name"]), ""),
        endpoint:string(tags["parent.span.name"]),
        operation:string(tags["span.name"]))
filter parent_service = "<leaf-service>" and parent_env = "<environment>"
    and service_kind = "DATABASE" and database = "<database>"
    // and parent_service_namespace = "<namespace>"   // add when a namespace was given
make_col
    calls_per_invocation: if(parent_invocations > 0, calls / float64(parent_invocations), float64_null()),
    avg_call_ms: float64(total_duration) / float64(calls) / 1000000.0,
    total_time_ms: float64(total_duration) / 1000000.0,
    low_sample: calls < 10 or parent_invocations = 0
filter calls > 0
sort desc(total_duration)
```

_Peak-bucket sensitivity check (bursty/intermittent endpoint):_ swap `align options(bins: 1)` for a bin **finer than the window** (e.g. `align 5m` on a 1 h window — `align 1h` on a 1 h window is a single bucket and no-ops), **keep the full Phase 4 `group_by`** (parent*service, parent_env, parent_service_namespace, service_kind, database, endpoint, operation) and the post-`aggregate` scoping `filter`, add `make_col ratio: if(parent_invocations > 0, calls / float64(parent_invocations), float64_null())`, then collapse across buckets with **`statsby peak_ratio:max(ratio), group_by(endpoint, operation)`** — `statsby`, not `aggregate`: after `align`, a plain `aggregate` re-aggregates \_within* each bucket and does not collapse the time axis. A high peak confirms an N+1 the window average dilutes; report both when they diverge.

### Phase 4b — RPC / service-edge fan-out

Group by calling endpoint × operation; scope to service edges (`E_HTTP`/`E_OTHER`); keep only the **true-endpoint** rows (`endpoint != operation`, i.e. drop the op-named ~1.0 twin); do **not** require `service.name` (fan-out rows often lack it). Rank by ratio. Name the target by its `operation` when the callee is `(unresolved)`.

```opal
align options(bins: 1),
    duration_sum:sum(m("apm_service_edge_duration_sum_by_endpoint")),
    calls:sum(m("apm_service_edge_call_count_by_endpoint")),
    parent_invocations:sum(m("apm_service_edge_call_count_by_endpoint_unique"))
aggregate
    total_duration:sum(duration_sum), calls:sum(calls), parent_invocations:sum(parent_invocations),
    group_by(
        parent_service:string(tags["parent.service.name"]),
        parent_env:string(tags["parent.environment"]),
        parent_service_namespace:string(tags["parent.service.namespace"]),
        service_kind:coalesce(string(tags["service.kind"]), "INTERNAL"),
        endpoint:string(tags["parent.span.name"]),
        operation:string(tags["span.name"]),
        downstream:coalesce(string(tags["service.name"]), string(tags["peer.server.address"]), "(unresolved)"))
filter parent_service = "<service>" and parent_env = "<environment>"
    and (service_kind = "E_HTTP" or service_kind = "E_OTHER")
    and endpoint != operation
    // and parent_service_namespace = "<namespace>"   // add when a namespace was given
make_col
    calls_per_invocation: if(parent_invocations > 0, calls / float64(parent_invocations), float64_null()),
    avg_call_ms: float64(total_duration) / float64(calls) / 1000000.0,
    total_time_ms: float64(total_duration) / 1000000.0,
    low_sample: calls < 10 or parent_invocations = 0
filter calls > 0
sort desc(calls_per_invocation), desc(total_duration)
```

_Peak-bucket (bursty RPC fan-out):_ re-bucket as in Phase 4 — a bin **finer than the window** (`align 5m`), keep the full Phase 4b `group_by` + scoping filter, `make_col ratio: if(parent_invocations > 0, calls / float64(parent_invocations), float64_null())`, then `statsby peak_ratio:max(ratio), group_by(endpoint, operation)`.

## Service RED — dataset **Tracing/Service Metrics**

### Phase 1 — per-service p95 + throughput

`apm_service_call_count` is a **delta** counter (`sum(m(...))`); `apm_service_duration` is a **tdigest** — read it with `histogram_combine(m_tdigest(...))` and extract percentiles with `histogram_quantile` (**never `sum()` a tdigest**). The dataset spans all namespaces — scope by `service.namespace` to isolate one app.

```opal
align options(bins: 1),
    calls:sum(m("apm_service_call_count")),
    dur:histogram_combine(m_tdigest("apm_service_duration"))
aggregate
    calls:sum(calls), dur:histogram_combine(dur),
    group_by(
        service:string(tags["service.name"]),
        env:string(tags["environment"]),
        namespace:string(tags["service.namespace"]))
filter env = "<environment>"          // omit when no env given (returns one row per env); add namespace = "<namespace>" when known
make_col p95_ms: histogram_quantile(dur, 0.95) / 1000000.0
sort desc(p95_ms)
```

Read `p95_ms`; the `dur` column is the combined tdigest **state blob** (`{"state":[…]}`, multi-KB output) — ignore it, or drop it by appending `pick_col valid_from, valid_to, service, env, namespace, calls, p95_ms` (a metric dataset requires `valid_from`/`valid_to` in the pick).

## Span evidence — dataset **Tracing/Span** (the _modeled_ span dataset)

Keep these scoped (filter to the op/db, `limit` a few traces). `duration` is nanoseconds — convert before aggregating. `service_name`, `environment`, `span_type`, `span_name`, `duration`, `trace_id` are span columns; `peer.db.name`, `db.statement`, `rpc.method` are span attributes. (This is the modeled `Tracing/Span`, **not** `Tracing/Span Raw` — the raw OTel dataset has a `resource_attributes.*` schema and no `service_name`, so these queries error or return 0 rows against it. Do not bind `spanRawDatasetId` here.)

### Phase 5 — database edge (per-trace calls + statement)

```opal
filter service_name = "<leaf-service>"
filter environment = "<environment>"
filter span_type = "Remote call"
filter string(attributes["peer.db.name"]) = "<database>"
statsby
    db_calls_in_trace: count(),
    total_db_time_ms: sum(float64(duration)) / 1000000.0,
    statements: array_agg_distinct(string(attributes["db.statement"])),
    group_by(trace_id, op:string(span_name))
sort desc(db_calls_in_trace)
limit 5
```

Scope by `peer.db.name` + `span_type` (the metric `span.name`, e.g. a cache command, can differ from the span-side `span_name`, e.g. `sql.conn.query`, so a `span_name` filter can return nothing — optional refinement only). **Group by `op:string(span_name)`** (as above) for a multi-command datastore (a cache/datastore serving many operation types) — it isolates the looping op's per-trace count instead of lumping every command under `trace_id`. If too heavy on a wide window, do two passes: `statsby count() group_by(trace_id) … limit 20` first, then pull `db.statement` on the top trace ids.

### Phase 5 — service (RPC) edge (per-trace calls)

Read the full `operation` string from the Phase 4/4b `--json` output (op names truncate in table view); match on a **stable substring** because a downstream peer often resolves to an IP under `peer.server.address` rather than a service name.

```opal
filter service_name = "<caller-service>"
filter environment = "<environment>"
filter span_type = "Remote call"
filter contains(span_name, "<operation>")  // case-sensitive substring match, tolerates the metric-op vs span_name mismatch; fallbacks: span_name = "<operation>", or string(attributes["rpc.method"])
statsby
    calls_in_trace: count(),
    total_time_ms: sum(float64(duration)) / 1000000.0,
    group_by(trace_id)
sort desc(calls_in_trace)
limit 5
```
