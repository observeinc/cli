import { CURRENT_CLI_VERSION } from "./constants";

const AGENT_NAME_SLUG: Record<string, string> = {
  claude: "claude-code",
  cowork: "claude-cowork",
};

export function mapAgentNameToCallerSlug(name: string) {
  if (name in AGENT_NAME_SLUG) {
    return AGENT_NAME_SLUG[name];
  }
  const base = name.split("@")[0]?.trim().toLowerCase() ?? name;
  const sanitized = base.replace(/[^a-z0-9-]/g, "");
  return sanitized.length > 0 ? sanitized : name;
}

/**
 * Host-agent session env vars, in precedence order. The first one present
 * supplies the session id. Extend by appending new agents.
 */
const SESSION_ENV_VARS = [
  "CLAUDE_CODE_SESSION_ID",
  "CURSOR_CONVERSATION_ID",
  "CODEX_THREAD_ID",
  "CORTEX_SESSION_ID",
];

/**
 * Read the host agent's session id from the environment, if present.
 * Returns the id of the first known session env var that is set, or undefined
 * when none is.
 */
export function detectSessionId(
  env: Record<string, string | undefined> = process.env,
): string | undefined {
  for (const name of SESSION_ENV_VARS) {
    const id = env[name];
    if (id !== undefined && id !== "") {
      return id;
    }
  }
  return undefined;
}

export async function detectCaller({
  determineAgent: determineAgentFn,
}: {
  determineAgent?: typeof import("@vercel/detect-agent").determineAgent;
} = {}) {
  const detectFn =
    determineAgentFn ?? (await import("@vercel/detect-agent")).determineAgent;
  const { isAgent, agent } = await detectFn();
  if (!isAgent) {
    return undefined;
  }
  return mapAgentNameToCallerSlug(agent.name);
}

export function buildObserveCliUserAgent(caller?: string) {
  const base = `observe-cli-ts/${CURRENT_CLI_VERSION}`;
  return caller ? `${base} caller/${caller}` : base;
}

export let OBSERVE_CLI_USER_AGENT = buildObserveCliUserAgent();

/**
 * Resolved caller slug (e.g. "claude-code", "cursor"), populated by
 * initUserAgent(). Exposed so telemetry can stamp it on the span without
 * re-running agent detection. Undefined when no host agent is detected.
 */
export let OBSERVE_CALLER: string | undefined;

export async function initUserAgent({
  determineAgent,
}: {
  determineAgent?: typeof import("@vercel/detect-agent").determineAgent;
} = {}) {
  const caller = await detectCaller({ determineAgent });
  OBSERVE_CALLER = caller;
  OBSERVE_CLI_USER_AGENT = buildObserveCliUserAgent(caller);
}

export function observeApiHeaders(extra?: Record<string, string>) {
  return {
    "User-Agent": OBSERVE_CLI_USER_AGENT,
    ...extra,
  };
}
