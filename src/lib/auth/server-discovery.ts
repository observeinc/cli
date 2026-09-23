/**
 * Server Discovery
 *
 * Discovers available Observe accounts that the user has
 * previously logged into via the account.observeinc.com portal.
 *
 * Uses a browser-based flow to access browser cookies:
 * 1. CLI starts a local HTTP server
 * 2. CLI opens browser to account server with redirect URL
 * 3. Server reads browser cookies, gets server list, redirects back
 * 4. CLI receives the server list from the callback
 */

import * as http from "node:http";
import * as readline from "node:readline";
import { z } from "zod";
import { openBrowser } from "../browser";

export interface ServerInfo {
  /** The full host URL (e.g., "123456789012.observeinc.com") */
  host: string;
  /** The account name */
  name: string;
  /** The account icon identifier */
  icon: string;
  /** The full URL to the account */
  url: string;
}

const CALLBACK_PATH = "/callback";
const DEFAULT_PORT = 8085;

const SECURE_HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "Content-Security-Policy": "default-src 'none'",
  "Referrer-Policy": "no-referrer",
};

const ServerInfoSchema = z.object({
  host: z.string(),
  name: z.string(),
  icon: z.string(),
  url: z.string(),
});

const ServersArraySchema = z.array(ServerInfoSchema);

/**
 * Fetch the list of servers the user has previously logged into.
 * Opens a browser to the account server which reads cookies and redirects back.
 */
export async function fetchAvailableServers({
  accountServerUrl,
  port = DEFAULT_PORT,
}: {
  accountServerUrl: string;
  port?: number;
}): Promise<ServerInfo[]> {
  return new Promise((resolve, reject) => {
    const connections = new Set<import("node:net").Socket>();
    // eslint-disable-next-line prefer-const
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const cleanup = () => {
      clearTimeout(timeoutId);
      for (const conn of connections) {
        conn.destroy();
      }
    };

    const server = http.createServer((req, res) => {
      // Only handle the callback path
      if (!req.url?.startsWith(CALLBACK_PATH)) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }

      // Parse query parameters from the callback URL
      const url = new URL(req.url, `http://localhost:${port}`);
      const serversParam = url.searchParams.get("servers");
      const error = url.searchParams.get("error");

      // Send a response to the browser
      res.writeHead(200, SECURE_HEADERS);

      if (error) {
        res.end(
          `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>Account Discovery Failed</title>
            </head>
            <body style="font-family: system-ui; text-align: center; padding: 50px;">
              <h1 style="color: #d32f2f;">❌ Account Discovery Failed</h1>
              <p>${Bun.escapeHTML(error)}</p>
              <p>You can close this window and return to your terminal.</p>
            </body>
          </html>
        `,
          () => {
            cleanup();
            server.close();
            reject(new Error(error));
          },
        );
        return;
      }

      // Parse the servers list from the response
      // Response format: {"code":200,"status":"ok","message":"OK","data":{"servers":[...]}}
      let servers: ServerInfo[] = [];
      if (serversParam) {
        const decoded = decodeURIComponent(serversParam);
        let parsed: unknown;
        try {
          parsed = JSON.parse(decoded);
        } catch {
          parsed = undefined;
        }

        if (parsed !== undefined) {
          const bare = ServersArraySchema.safeParse(parsed);
          if (bare.success) {
            servers = bare.data;
          } else {
            const wrapped = z
              .object({ servers: ServersArraySchema })
              .safeParse(parsed);
            if (wrapped.success) {
              servers = wrapped.data.servers;
            } else {
              const nested = z
                .object({ data: z.object({ servers: ServersArraySchema }) })
                .safeParse(parsed);
              if (nested.success) {
                servers = nested.data.data.servers;
              }
            }
          }
        }
      }

      const html =
        servers.length === 0
          ? `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>No Accounts Found</title>
          </head>
          <body style="font-family: system-ui; text-align: center; padding: 50px;">
            <h1 style="color: #f59e0b;">⚠ No Accounts Found</h1>
            <p>No Observe accounts were found associated with your login.</p>
            <p>You will need to specify your Observe instance URL directly:</p>
            <p style="font-family: monospace; background: #f3f4f6; padding: 10px; border-radius: 4px;">
              observe login --url &lt;your-instance&gt;.observeinc.com
            </p>
            <p>You can close this window and return to your terminal.</p>
          </body>
        </html>
      `
          : `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Account Discovery Complete</title>
          </head>
          <body style="font-family: system-ui; text-align: center; padding: 50px;">
            <h1 style="color: #4caf50;">&#10003; Account Discovery Complete</h1>
            <p>Found ${servers.length} account(s).</p>
            <p>You can close this window and return to your terminal.</p>
          </body>
        </html>
      `;

      res.end(html, () => {
        cleanup();
        server.close();
        resolve(servers);
      });
    });

    // Track connections so we can destroy them on close
    server.on("connection", (conn) => {
      connections.add(conn);
      conn.on("close", () => connections.delete(conn));
    });

    // Handle server errors
    server.on("error", (err) => {
      cleanup();
      reject(new Error(`Failed to start local server: ${err.message}`));
    });

    // Start the server and open browser
    server.listen(port, "127.0.0.1", () => {
      const callbackUrl = `http://localhost:${port}${CALLBACK_PATH}`;
      const discoveryUrl = `${accountServerUrl}/cli/servers?redirect=${encodeURIComponent(callbackUrl)}`;
      openBrowser(discoveryUrl);
    });

    // Set a timeout to prevent hanging forever (30 seconds)
    timeoutId = setTimeout(() => {
      cleanup();
      server.close();
      reject(new Error("Timed out waiting for account discovery"));
    }, 30000);
  });
}

/**
 * Prompt the user to select a server from a list
 */
export async function promptServerSelection({
  servers,
  stdin,
  stdout,
}: {
  servers: ServerInfo[];
  stdin: NodeJS.ReadableStream;
  stdout: NodeJS.WritableStream;
}): Promise<ServerInfo> {
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: stdin,
      output: stdout,
    });

    stdout.write("\nMultiple Observe accounts found. Please select one:\n\n");

    servers.forEach((server, index) => {
      stdout.write(`  ${index + 1}. ${server.name} (${server.host})\n`);
    });

    stdout.write("\n");

    const askQuestion = () => {
      rl.question(`Enter selection (1-${servers.length}): `, (answer) => {
        const selection = parseInt(answer, 10);

        if (isNaN(selection) || selection < 1 || selection > servers.length) {
          stdout.write(
            `Invalid selection. Please enter a number between 1 and ${servers.length}.\n`,
          );
          askQuestion();
          return;
        }

        rl.close();
        const selected = servers[selection - 1];
        if (selected) {
          resolve(selected);
        }
      });
    };

    askQuestion();

    rl.on("close", () => {
      // Handle Ctrl+C
    });

    rl.on("SIGINT", () => {
      rl.close();
      reject(new Error("Selection cancelled"));
    });
  });
}
