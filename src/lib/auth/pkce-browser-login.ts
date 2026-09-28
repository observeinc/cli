/**
 * Browser-based OAuth login using Authorization Code + PKCE with Dynamic Client Registration.
 *
 * Flow:
 * 1. Dynamically register a client via POST /v1/oauth/register (DCR, RFC 7591)
 * 2. Generate PKCE code_verifier + code_challenge (S256, RFC 7636)
 * 3. Open browser to /oauth/authorize with PKCE + state params
 * 4. Receive ?code=...&state=... on local callback server
 * 5. Verify state nonce, exchange code via POST /v1/oauth/token
 * 6. Return access_token ("{customerId} {secret}" format)
 */

import { createHash, randomBytes } from "node:crypto";
import * as http from "node:http";
import { openBrowser } from "../browser";

export interface PKCEBrowserLoginResult {
  success: boolean;
  /** Raw access token in "{customerId} {secret}" format */
  accessToken?: string;
  /** The full authorize URL, for display when the browser cannot be opened automatically */
  authorizeUrl?: string;
  error?: string;
}

function generateCodeVerifier(): string {
  return randomBytes(32).toString("base64url");
}

function computeCodeChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

function generateState(): string {
  return randomBytes(16).toString("base64url");
}

async function registerDynamicClient(
  baseUrl: string,
  redirectUri: string,
): Promise<string> {
  const response = await fetch(`${baseUrl}/v1/oauth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      redirect_uris: [redirectUri],
      client_name: "Observe CLI",
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Client registration failed (${response.status}): ${text}`);
  }
  const data = (await response.json()) as { client_id?: string };
  if (!data.client_id) {
    throw new Error("Client registration response missing client_id");
  }
  return data.client_id;
}

async function exchangeCodeForToken(
  baseUrl: string,
  {
    code,
    codeVerifier,
    clientId,
    redirectUri,
  }: {
    code: string;
    codeVerifier: string;
    clientId: string;
    redirectUri: string;
  },
): Promise<string> {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    code_verifier: codeVerifier,
    client_id: clientId,
    redirect_uri: redirectUri,
  });
  const response = await fetch(`${baseUrl}/v1/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token exchange failed (${response.status}): ${text}`);
  }
  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error("Token response missing access_token");
  }
  return data.access_token;
}

const CALLBACK_PATH = "/callback";

const SECURE_HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "Content-Security-Policy": "default-src 'none'",
  "Referrer-Policy": "no-referrer",
};

function escapeHtml(s: string): string {
  return s.replace(
    /[<>&"]/g,
    (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c] ?? c,
  );
}

function successPage(): string {
  return `<!DOCTYPE html>
<html>
  <head><meta charset="utf-8"><title>Authentication Successful</title></head>
  <body style="font-family:system-ui;text-align:center;padding:50px">
    <h1 style="color:#4caf50">&#10003; Authentication Successful!</h1>
    <p>You have successfully authenticated with Observe.</p>
    <p>You can close this window and return to your terminal.</p>
  </body>
</html>`;
}

function errorPage(message: string): string {
  return `<!DOCTYPE html>
<html>
  <head><meta charset="utf-8"><title>Authentication Failed</title></head>
  <body style="font-family:system-ui;text-align:center;padding:50px">
    <h1 style="color:#d32f2f">&#10007; Authentication Failed</h1>
    <p>${escapeHtml(message)}</p>
    <p>You can close this window and return to your terminal.</p>
  </body>
</html>`;
}

/**
 * Perform browser-based OAuth login using Authorization Code + PKCE.
 * Handles DCR, browser redirect, callback, and token exchange.
 *
 * @param onReady - called with the authorize URL once the local server is
 *   listening, before the browser is opened. Use this to display the URL as a
 *   fallback in headless environments.
 */
export async function performPKCEBrowserLogin({
  baseUrl,
  port = 8085,
  onReady,
}: {
  baseUrl: string;
  port?: number;
  onReady?: (authorizeUrl: string) => void;
}): Promise<PKCEBrowserLoginResult> {
  const redirectUri = `http://localhost:${port}${CALLBACK_PATH}`;

  let clientId: string;
  try {
    clientId = await registerDynamicClient(baseUrl, redirectUri);
  } catch (err) {
    return {
      success: false,
      error: `Registration failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = computeCodeChallenge(codeVerifier);
  const state = generateState();

  const authorizeUrl = new URL(`${baseUrl}/oauth/authorize`);
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("code_challenge", codeChallenge);
  authorizeUrl.searchParams.set("code_challenge_method", "S256");
  authorizeUrl.searchParams.set("state", state);

  return new Promise((resolve) => {
    const connections = new Set<import("node:net").Socket>();

    const server = http.createServer((req, res) => {
      void (async () => {
        if (!req.url?.startsWith(CALLBACK_PATH)) {
          res.writeHead(404);
          res.end("Not found");
          return;
        }

        const callbackUrl = new URL(req.url, `http://localhost:${port}`);
        const code = callbackUrl.searchParams.get("code");
        const returnedState = callbackUrl.searchParams.get("state");
        const error = callbackUrl.searchParams.get("error");

        const finish = (result: PKCEBrowserLoginResult, html: string) => {
          res.writeHead(200, SECURE_HEADERS);
          res.end(html, () => {
            server.close();
            for (const conn of connections) conn.destroy();
          });
          resolve(result);
        };

        if (error) {
          finish({ success: false, error }, errorPage(error));
          return;
        }

        if (!code) {
          finish(
            { success: false, error: "Missing authorization code" },
            errorPage("Missing authorization code"),
          );
          return;
        }

        if (returnedState !== state) {
          finish(
            { success: false, error: "State mismatch" },
            errorPage("State mismatch — possible CSRF"),
          );
          return;
        }

        let accessToken: string;
        try {
          accessToken = await exchangeCodeForToken(baseUrl, {
            code,
            codeVerifier,
            clientId,
            redirectUri,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          finish({ success: false, error: msg }, errorPage(msg));
          return;
        }

        finish({ success: true, accessToken }, successPage());
      })();
    });

    server.on("connection", (conn) => {
      connections.add(conn);
      conn.on("close", () => connections.delete(conn));
    });

    server.on("error", (err) => {
      resolve({
        success: false,
        error: `Failed to start local server: ${err.message}`,
      });
    });

    server.listen(port, "127.0.0.1", () => {
      onReady?.(authorizeUrl.toString());
      openBrowser(authorizeUrl.toString());
    });
  });
}
