import { describe, expect, test } from "bun:test";
import { GqlApiError } from "../gql/gql-request";
import { ResponseError } from "../rest/generated/runtime";
import { FEATURE_NOT_ENABLED_MESSAGE, formatApiError } from "./format-error";

function jsonResponse(
  status: number,
  statusText: string,
  body: unknown,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    statusText,
    headers: { "content-type": "application/json" },
  });
}

function textResponse(
  status: number,
  statusText: string,
  body: string,
): Response {
  return new Response(body, {
    status,
    statusText,
    headers: { "content-type": "text/plain" },
  });
}

describe("formatApiError", () => {
  describe("ResponseError", () => {
    test("extracts `message` from JSON body and prepends HTTP status line", async () => {
      const err = new ResponseError(
        jsonResponse(404, "Not Found", { message: "dataset not found" }),
      );
      expect(await formatApiError(err)).toBe(
        "HTTP 404 Not Found: dataset not found",
      );
    });

    test("falls back to `error` field when `message` is absent", async () => {
      const err = new ResponseError(
        jsonResponse(400, "Bad Request", { error: "invalid filter" }),
      );
      expect(await formatApiError(err)).toBe(
        "HTTP 400 Bad Request: invalid filter",
      );
    });

    test("falls back to `detail` field", async () => {
      const err = new ResponseError(
        jsonResponse(422, "Unprocessable Entity", {
          detail: "field 'name' is required",
        }),
      );
      expect(await formatApiError(err)).toBe(
        "HTTP 422 Unprocessable Entity: field 'name' is required",
      );
    });

    test("falls back to `description` field", async () => {
      const err = new ResponseError(
        jsonResponse(500, "Internal Server Error", {
          description: "boom",
        }),
      );
      expect(await formatApiError(err)).toBe(
        "HTTP 500 Internal Server Error: boom",
      );
    });

    test("ignores blank/whitespace string fields and continues searching", async () => {
      const err = new ResponseError(
        jsonResponse(400, "Bad Request", {
          message: "   ",
          error: "real reason",
        }),
      );
      expect(await formatApiError(err)).toBe(
        "HTTP 400 Bad Request: real reason",
      );
    });

    test("joins `errors[]` array of objects with '; '", async () => {
      const err = new ResponseError(
        jsonResponse(400, "Bad Request", {
          errors: [{ message: "first" }, { message: "second" }],
        }),
      );
      expect(await formatApiError(err)).toBe(
        "HTTP 400 Bad Request: first; second",
      );
    });

    test("joins `errors[]` array of strings", async () => {
      const err = new ResponseError(
        jsonResponse(400, "Bad Request", { errors: ["a", "b"] }),
      );
      expect(await formatApiError(err)).toBe("HTTP 400 Bad Request: a; b");
    });

    test("returns raw JSON body when no recognized fields are present", async () => {
      const payload = { unexpected: "shape", code: 7 };
      const err = new ResponseError(jsonResponse(409, "Conflict", payload));
      expect(await formatApiError(err)).toBe(
        `HTTP 409 Conflict: ${JSON.stringify(payload)}`,
      );
    });

    test("uses raw text body when body is not JSON", async () => {
      const err = new ResponseError(
        textResponse(502, "Bad Gateway", "upstream timed out"),
      );
      expect(await formatApiError(err)).toBe(
        "HTTP 502 Bad Gateway: upstream timed out",
      );
    });

    test("returns just the status line when the body is empty", async () => {
      const err = new ResponseError(
        textResponse(503, "Service Unavailable", ""),
      );
      expect(await formatApiError(err)).toBe("HTTP 503 Service Unavailable");
    });

    test("returns just the status line when the body is only whitespace", async () => {
      const err = new ResponseError(
        textResponse(503, "Service Unavailable", "   \n\t  "),
      );
      expect(await formatApiError(err)).toBe("HTTP 503 Service Unavailable");
    });

    test("omits statusText from the status line when it is empty", async () => {
      const err = new ResponseError(
        new Response("nope", { status: 418, statusText: "" }),
      );
      expect(await formatApiError(err)).toBe("HTTP 418: nope");
    });

    test("replaces a 403 feature_not_enabled with a friendly message", async () => {
      const err = new ResponseError(
        jsonResponse(403, "Forbidden", {
          type: "feature_not_enabled",
          message: "the source datasets API is not enabled for customer 123",
        }),
      );
      expect(await formatApiError(err)).toBe(FEATURE_NOT_ENABLED_MESSAGE);
    });

    test("keeps the server message for other 403 types", async () => {
      const err = new ResponseError(
        jsonResponse(403, "Forbidden", {
          type: "failed_authorization",
          message: "permission denied",
        }),
      );
      expect(await formatApiError(err)).toBe(
        "HTTP 403 Forbidden: permission denied",
      );
    });

    test("does not consume the original response body (uses .clone())", async () => {
      const response = jsonResponse(404, "Not Found", { message: "gone" });
      const err = new ResponseError(response);

      await formatApiError(err);

      expect(response.bodyUsed).toBe(false);
      expect(await response.json()).toEqual({ message: "gone" });
    });
  });

  describe("non-ResponseError inputs", () => {
    test("returns the message of a GqlApiError", async () => {
      const err = new GqlApiError("graphql blew up", 500);
      expect(await formatApiError(err)).toBe("graphql blew up");
    });

    test("returns the message of a generic Error", async () => {
      expect(await formatApiError(new Error("plain"))).toBe("plain");
    });

    test("stringifies thrown strings", async () => {
      expect(await formatApiError("oops")).toBe("oops");
    });

    test("stringifies thrown numbers", async () => {
      expect(await formatApiError(42)).toBe("42");
    });

    test("stringifies null and undefined", async () => {
      expect(await formatApiError(null)).toBe("null");
      expect(await formatApiError(undefined)).toBe("undefined");
    });
  });
});
