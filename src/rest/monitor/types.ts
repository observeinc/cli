import type {
  MonitorHealth,
  MonitorV2ActionRule,
  MonitorV2Definition,
  MonitorV2RuleKind,
  MonitorV2Scheduling,
} from "../generated";

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
