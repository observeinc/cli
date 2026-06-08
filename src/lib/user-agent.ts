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

export async function initUserAgent({
  determineAgent,
}: {
  determineAgent?: typeof import("@vercel/detect-agent").determineAgent;
} = {}) {
  const caller = await detectCaller({ determineAgent });
  OBSERVE_CLI_USER_AGENT = buildObserveCliUserAgent(caller);
}

export function observeApiHeaders(extra?: Record<string, string>) {
  return {
    "User-Agent": OBSERVE_CLI_USER_AGENT,
    ...extra,
  };
}
