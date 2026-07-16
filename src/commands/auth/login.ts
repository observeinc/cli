/**
 * Login Command
 *
 * Provides browser-based and device code authentication flows
 * for the Observe CLI.
 */

import { defineCommand } from "../../lib/stricli-wrappers";
import chalk from "chalk";
import type { LocalContext } from "../../context";
import {
  configExists,
  getActiveProfileName,
  getConfigPath,
  saveConfig,
} from "../../lib/config";
import type { Writer } from "../../lib/writer";
import { performPKCEBrowserLogin } from "../../lib/auth/pkce-browser-login";
import { performDeviceCodeLogin } from "../../lib/auth/device-code-login";
import {
  fetchAvailableServers,
  promptServerSelection,
  type ServerInfo,
} from "../../lib/auth/server-discovery";

interface LoginCommandFlags {
  profile?: string;
  url?: string;
  useDeviceCode?: boolean;
  port?: number;
}

const DEFAULT_PORT = 8085;

const ROUTES = {
  deviceLogin: "/cli/device/login",
  deviceLoginPoll: "/cli/device/login/poll",
  deviceVerify: "/cli/device",
} as const;

/**
 * Detect if we're running in a headless environment where browser auth won't work.
 */
function isHeadlessEnvironment(): boolean {
  // SSH session
  if (process.env.SSH_CLIENT || process.env.SSH_TTY) {
    return true;
  }

  // No display on Linux
  if (process.platform === "linux" && !process.env.DISPLAY) {
    return true;
  }

  // Docker container (common indicator)
  if (process.env.container === "docker") {
    return true;
  }

  // CI environments
  if (process.env.CI === "true" || process.env.CI === "1") {
    return true;
  }

  return false;
}

/**
 * Parse URL input which can be:
 * - A full URL like "https://123456.observeinc.com"
 * - A hostname like "123456.observeinc.com"
 *
 * Returns the domain suffix and customerId if parsed from URL.
 */
function parseUrlInput(input?: string): {
  domain?: string;
  customerId?: string;
} {
  if (!input) {
    return {};
  }

  // Add https:// if no protocol provided
  const urlString =
    input.startsWith("http://") || input.startsWith("https://")
      ? input
      : `https://${input}`;

  try {
    const url = new URL(urlString);
    const hostname = url.hostname;

    // Try to extract customerId and domain from hostname like "123456.observeinc.com"
    const match = /^(\d+)\.(.+)\.com$/.exec(hostname);
    if (match) {
      return {
        domain: match[2],
        customerId: match[1],
      };
    }

    // Couldn't parse customerId, return the hostname as domain
    return { domain: hostname };
  } catch {
    // Invalid URL
    return {};
  }
}

/**
 * Build the account server URL for discovery.
 */
function buildDomainAccountUrl() {
  const domain = process.env.OBSERVE_DOMAIN ?? "observeinc";
  const url = new URL(`https://account.${domain}.com`);
  if (process.env.OBSERVE_ACCOUNT_PORT) {
    url.port = process.env.OBSERVE_ACCOUNT_PORT;
  }
  return url.origin;
}

/**
 * Build the customer server URL.
 */
function buildCustomerMainappURL({
  customerId,
  domain,
}: {
  customerId: string;
  domain: string;
}) {
  const url = new URL(`https://${customerId}.${domain}.com`);
  if (process.env.OBSERVE_MAINAPP_PORT) {
    url.port = process.env.OBSERVE_MAINAPP_PORT;
  }
  return url.origin;
}

/**
 * Resolve the target server URL via discovery.
 * Discovers available servers from account.{domain}.com
 */
async function discoverTargetServer({
  process,
  writer,
}: {
  process: NodeJS.Process;
  writer: Writer;
}): Promise<string> {
  const accountServerUrl = buildDomainAccountUrl();

  writer.info("Opening browser to discover available accounts...");

  let servers: ServerInfo[];
  try {
    servers = await fetchAvailableServers({ accountServerUrl });
  } catch (cause) {
    throw new Error(
      `Could not connect to Observe at ${accountServerUrl}. Please specify --url`,
      { cause },
    );
  }

  // No servers found - user needs to specify
  if (servers.length === 0) {
    throw new Error(
      "No Observe accounts found. Please specify --url\n" +
        "  Example: observe auth login --url 123456.observeinc.com",
    );
  }

  // Single server - use it automatically
  const [server] = servers;
  if (servers.length === 1 && server) {
    writer.info(`Found account: ${server.name} (${server.host})\n`);
    return server.url;
  }

  // Multiple servers - prompt user to select
  const selected = await promptServerSelection({
    servers,
    stdin: process.stdin,
    stdout: process.stdout,
  });
  writer.info(`\nSelected: ${selected.name} (${selected.host})\n`);
  return selected.url;
}

interface AuthResult {
  customerId: string;
  token: string;
  domain: string;
  apiUrl?: string;
  tokenId?: string;
}

/**
 * Perform device code authentication flow
 */
async function doDeviceCodeLogin({
  baseUrl,
  writer,
}: {
  baseUrl: string;
  writer: Writer;
}): Promise<AuthResult> {
  writer.write(chalk.cyan("Initiating device code authentication...\n"));

  const deviceLoginUrl = `${baseUrl}${ROUTES.deviceLogin}`;
  const pollUrl = `${baseUrl}${ROUTES.deviceLoginPoll}`;
  const verificationUrl = `${baseUrl}${ROUTES.deviceVerify}`;

  const result = await performDeviceCodeLogin({
    deviceLoginUrl,
    pollUrl,
    verificationUrl,
    onCodeReceived: (userCode, verificationUri) => {
      writer.write(chalk.bold("To authenticate, visit:"));
      writer.write(chalk.cyan.underline(`  ${verificationUri}\n`));
      writer.write(chalk.bold("And enter the code:"));
      writer.write(chalk.green.bold(`  ${userCode}\n`));
      writer.info("Waiting for authentication...");
    },
  });

  if (!result.success) {
    throw new Error(result.error ?? "Authentication failed");
  }

  if (!result.customerId || !result.token || !result.domain) {
    throw new Error("Missing credentials in response");
  }

  return {
    customerId: result.customerId,
    token: result.token,
    domain: result.domain,
    apiUrl: result.apiUrl,
    tokenId: result.tokenId,
  };
}

/**
 * Perform browser-based authentication flow using Authorization Code + PKCE.
 */
async function doBrowserLogin({
  baseUrl,
  port,
  writer,
}: {
  baseUrl: string;
  port: number;
  writer: Writer;
}): Promise<AuthResult> {
  writer.write(chalk.cyan("Opening browser for authentication..."));
  writer.info(`Listening on http://localhost:${port}\n`);

  const result = await performPKCEBrowserLogin({
    baseUrl,
    port,
    onReady: (url) => {
      writer.info("If your browser doesn't open automatically, visit:");
      writer.info(`  ${url}\n`);
    },
  });

  if (!result.success || !result.accessToken) {
    throw new Error(result.error ?? "Authentication failed");
  }

  // access_token format: "{customerId} {secret}"
  const spaceIdx = result.accessToken.indexOf(" ");
  if (spaceIdx === -1) {
    throw new Error("Invalid access token format from server");
  }
  const customerId = result.accessToken.slice(0, spaceIdx);
  const token = result.accessToken.slice(spaceIdx + 1);

  const parsed = parseUrlInput(baseUrl);
  const domain = parsed.domain ?? new URL(baseUrl).hostname;

  return { customerId, token, domain, apiUrl: baseUrl };
}

async function login(
  this: LocalContext,
  flags: LoginCommandFlags,
): Promise<void> {
  const { process, writer } = this;

  // Capture the currently active profile before the --profile flag overrides it,
  // so we can detect when credentials are saved to a non-active profile.
  const previousActiveProfile = getActiveProfileName();

  if (flags.profile !== undefined) {
    process.env.OBSERVE_PROFILE = flags.profile;
  }

  try {
    const port = flags.port ?? DEFAULT_PORT;
    let baseUrl: string;
    let authResult: AuthResult;

    // Device code flow requires a full URL since there's no browser for discovery
    const useDeviceCode = flags.useDeviceCode ?? isHeadlessEnvironment();

    // Parse URL input (handles full URLs like https://123456.observeinc.com)
    const parsedUrl = parseUrlInput(flags.url);

    if (useDeviceCode) {
      if (!parsedUrl.domain || !parsedUrl.customerId) {
        throw new Error(
          "Device code flow requires --url with a full customer URL.\n" +
            "  Example: observe auth login --useDeviceCode --url 123456.observeinc.com",
        );
      }

      if (!flags.useDeviceCode) {
        writer.warn(
          "Headless environment detected, using device code flow...\n",
        );
      }

      baseUrl = buildCustomerMainappURL({
        customerId: parsedUrl.customerId,
        domain: parsedUrl.domain,
      });
      authResult = await doDeviceCodeLogin({ baseUrl, writer });
    } else {
      // Browser flow
      if (parsedUrl.customerId && parsedUrl.domain) {
        // Full URL provided - go directly to customer server
        baseUrl = buildCustomerMainappURL({
          customerId: parsedUrl.customerId,
          domain: parsedUrl.domain,
        });
      } else {
        // No URL or incomplete - discover via account server
        baseUrl = await discoverTargetServer({ process, writer });
      }
      authResult = await doBrowserLogin({ baseUrl, port, writer });
    }

    // Save the configuration
    saveConfig({
      customerId: authResult.customerId,
      token: authResult.token,
      domain: authResult.domain,
      apiUrl: authResult.apiUrl,
      tokenId: authResult.tokenId,
    });

    const configPath = getConfigPath();
    const wasExisting = configExists();
    const savedProfileName = getActiveProfileName();

    writer.success(
      `Authentication ${wasExisting ? "updated" : "completed"} successfully!`,
    );
    writer.info(`  Profile: ${savedProfileName}`);
    writer.info(`  Config file: ${configPath}`);
    writer.info(`  Customer ID: ${authResult.customerId}`);
    writer.info(`  API URL: ${authResult.apiUrl}`);

    if (savedProfileName !== previousActiveProfile) {
      writer.info(
        `\nTo switch to this profile, run: observe auth profile use ${savedProfileName}`,
      );
      writer.info(
        `Or prefix commands with: OBSERVE_PROFILE=${savedProfileName}`,
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    writer.error(`Authentication failed: ${message}`);
    process.exitCode = 1;
  }
}

export const loginCommand = defineCommand({
  loader: async () => login,
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [],
    },
    flags: {
      profile: {
        kind: "parsed",
        parse: String,
        brief:
          "Profile name to save credentials under (default: active profile)",
        optional: true,
      },
      url: {
        kind: "parsed",
        parse: String,
        brief: "Observe URL (e.g., 123456.observeinc.com)",
        optional: true,
      },
      useDeviceCode: {
        kind: "boolean",
        brief: "Use device code flow for headless/remote authentication",
        optional: true,
      },
      port: {
        kind: "parsed",
        parse: Number,
        brief: `Local server port for browser callback (default: ${DEFAULT_PORT})`,
        optional: true,
      },
    },
    aliases: {
      P: "profile",
      u: "url",
      D: "useDeviceCode",
      p: "port",
    },
  },
  docs: {
    brief: "Authenticate with Observe using browser or device code flow",
    fullDescription: `Authenticate with Observe using browser-based OAuth (default) or device code flow.

Browser flow opens your default browser for authentication.
Device code flow (--useDeviceCode) is useful for headless/remote environments.

To switch between profiles after login, use OBSERVE_PROFILE env var or 'observe auth profile use <name>'.

Examples:
  observe auth login                                              # Discover accounts via browser
  observe auth login --url https://123456.observeinc.com         # Login to specific customer
  observe auth login --profile staging -u 123456.observeinc.com  # Login to a named profile
  observe auth login --useDeviceCode -u https://123456.observeinc.com  # Device code flow`,
  },
});
