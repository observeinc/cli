import { querystring, type Middleware } from "./generated/runtime";

/**
 * Pre-middleware that appends query params the generated client does not
 * declare. A key already on the URL is left alone, so it is a no-op once the
 * OpenAPI spec declares the param.
 */
export const addQueryParamsIfMissing =
  (
    params: Record<string, string | undefined>,
  ): NonNullable<Middleware["pre"]> =>
  async ({ url, init }) => {
    const present = new URL(url).searchParams;
    const missing = Object.fromEntries(
      Object.entries(params).filter(
        ([key, value]) => value !== undefined && !present.has(key),
      ),
    ) as Record<string, string>;
    // querystring() percent-encodes like the generated client ("a b" -> a%20b).
    const extra = querystring(missing);
    const separator = url.includes("?") ? "&" : "?";
    return { url: extra ? `${url}${separator}${extra}` : url, init };
  };
