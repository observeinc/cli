/**
 * Cross-platform browser opener.
 *
 * On macOS:   `open <url>`
 * On Windows: `cmd /c start "" <url>`  — `start` is a cmd.exe built-in, not
 *             a standalone binary, so spawning it directly throws ENOENT.
 *             The empty `""` is the window title argument that `start` expects
 *             before a URL containing special characters. `&` in the URL must
 *             be escaped as `^&` because cmd.exe treats bare `&` as a command
 *             separator.
 * On Linux:   `xdg-open <url>`
 */

import { spawn } from "node:child_process";

export function openBrowser(url: string): void {
  const platform = process.platform;

  if (platform === "darwin") {
    spawn("open", [url], { detached: true, stdio: "ignore" }).unref();
  } else if (platform === "win32") {
    // cmd.exe treats bare & as a command separator, so URLs with query
    // parameters (e.g. the PKCE authorize URL) would be truncated.
    const escapedUrl = url.replace(/&/g, "^&");
    spawn("cmd", ["/c", "start", "", escapedUrl], {
      detached: true,
      stdio: "ignore",
    }).unref();
  } else {
    try {
      spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref();
    } catch {
      // xdg-open may not be available in headless environments
    }
  }
}
