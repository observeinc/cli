/**
 * Parse a user-supplied Observe URL which can be:
 * - A full URL like "https://123456.observeinc.com"
 * - A hostname like "123456.observeinc.com"
 *
 * Returns `{ domain, customerId? }` on success, or `{ error }` when the input
 * is empty/missing or cannot be parsed as a URL.
 */
export function parseUrlInput(
  input?: string,
): { domain: string; customerId?: string } | { error: string } {
  if (!input) {
    return { error: "No URL provided" };
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
      const [, customerId, domain] = match;
      if (!domain || !customerId) {
        return { error: `Invalid URL: "${input}"` };
      }

      return { domain, customerId };
    }

    // Couldn't parse customerId, return the hostname as domain
    return { domain: hostname };
  } catch {
    return { error: `Invalid URL: "${input}"` };
  }
}
