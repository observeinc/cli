import type { MonitorHealth } from "../generated";

/*
 * Hand-written copies of the legacy `MonitorV2*` wire schemas.
 *
 * The CLI talks to the *unversioned* `/v1/monitors` endpoints, whose bodies the
 * API documents as stable ("does not change"). Newer specs describe only the
 * versioned shape (`MonitorCreateRequest` / `MonitorUpdateRequest` /
 * `MonitorResource`) and no longer define these schemas, so a client generated
 * from them has no export for any of the names below. Older specs still do,
 * which is why these keep the legacy names. This is a deliberate exception to
 * "use generated types directly".
 *
 * Remove them once the versioned request is enabled everywhere and the commands
 * move to the generated types.
 */

export enum MonitorV2RuleKind {
  Anomaly = "Anomaly",
  Count = "Count",
  Promote = "Promote",
  Threshold = "Threshold",
}

export enum MonitorV2ActionType {
  Email = "Email",
  PagerDuty = "PagerDuty",
  Slack = "Slack",
  Webhook = "Webhook",
}

/** Passed through verbatim from `--file`; the CLI never reads inside it. */
export type MonitorV2Definition = Record<string, unknown>;

/** Only the fields the CLI reads are typed; the rest round-trips untouched. */
export interface MonitorV2ActionRule {
  actionId?: string;
  definition?: {
    type: MonitorV2ActionType;
    inline?: boolean;
    name?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface MonitorV2Scheduling {
  transform?: { freshnessGoal?: string | number };
  scheduled?: {
    cronConfig?: string;
    timezone: string;
    alarmMode?: "PerRun" | "Ongoing";
  };
}

/** Body of the unversioned `PATCH /v1/monitors/{id}`. */
export interface MonitorV2PatchRequest {
  name?: string;
  description?: string;
  disabled?: boolean;
  ruleKind?: MonitorV2RuleKind;
  definition?: MonitorV2Definition;
  actionRules?: MonitorV2ActionRule[];
}

/**
 * The monitor body returned by the *unversioned* `/v1/monitors` endpoints,
 * which is what the CLI talks to.
 *
 * `POST /v1/monitors` and `GET /v1/monitors/{id}` serve two request shapes,
 * picked by the `Observe-Api-Version` header. Codegen describes the versioned
 * shape (`MonitorCreateRequest` / `MonitorResource`), so the generated client
 * carries no type for the default one — it dropped the former `MonitorV2`.
 * The default shape is documented as stable ("does not change"), and the
 * versioned request still returns 403 until it is enabled per account, so the
 * commands deliberately stay on it and this type describes what they receive.
 *
 * Everything below `id`/`name`/`ruleKind`/`definition` is optional because the
 * API omits fields rather than nulling them, and `preserveMonitorGetFields`
 * copies some of them back off the raw body.
 *
 * Replace this with the generated type once the versioned request is enabled
 * everywhere and the commands move to it.
 */
export interface Monitor {
  id: string;
  name: string;
  ruleKind: MonitorV2RuleKind;
  definition: MonitorV2Definition;
  description?: string | null;
  disabled?: boolean;
  health?: MonitorHealth;
  actionRules?: MonitorV2ActionRule[];
  effectiveScheduling?: MonitorV2Scheduling;
}
