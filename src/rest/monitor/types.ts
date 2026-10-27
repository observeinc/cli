import type { MonitorHealth } from "../generated";

/*
 * The unversioned shape's own types. The spec now describes only the
 * versioned shape, so codegen no longer emits these (it dropped the
 * `MonitorV2*` models); they are kept here as the default request documents
 * them. `definition` and the action's settings are passed through from the
 * user's file untouched, so only the fields the CLI reads are spelled out.
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

/** Input query, rules, grouping and the rest of the rule's configuration. */
export type MonitorV2Definition = Record<string, unknown>;

export interface MonitorV2ActionDefinition {
  type?: MonitorV2ActionType;
  inline?: boolean;
  [key: string]: unknown;
}

export interface MonitorV2ActionRule {
  actionId?: string;
  levels?: string[];
  conditions?: Record<string, unknown>;
  sendEndNotifications?: boolean;
  sendRemindersInterval?: boolean;
  definition?: MonitorV2ActionDefinition;
}

export interface MonitorV2Scheduling {
  transform?: { freshnessGoal?: string };
  scheduled?: { cronConfig?: string; timezone: string; alarmMode?: string };
}

export interface MonitorV2PatchRequest {
  name?: string;
  disabled?: boolean;
  description?: string;
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
