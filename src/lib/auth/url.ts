/**
 * Parse a user-supplied Observe URL which can be:
 * - A full URL like "https://123456.observeinc.com"
 * - A hostname like "123456.observeinc.com"
 *
 * Returns the domain suffix and customerId when the hostname matches the
 * standard customer pattern `{customerId}.{domain}.com`, or just the domain
 * when it does not. Returns null for empty/unparseable input.
 */
export function parseUrlInput(input?: string): {
  domain?: string;
  customerId?: string;
} | null {
  if (!input) {
    return null;
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
    return null;
  }
}
