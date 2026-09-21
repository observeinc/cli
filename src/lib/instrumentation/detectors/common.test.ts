import { describe, expect, test } from "bun:test";
import { dependencyCategory } from "./common";

describe("dependencyCategory", () => {
  test.each([
    // OTel instrumentation packages must be recognized as instrumentation, not
    // as the library they instrument — otherwise they are flagged as an
    // uncataloged gap (e.g. @prisma/instrumentation was miscategorized as orm).
    ["@prisma/instrumentation", "instrumentation"],
    ["@opentelemetry/instrumentation-http", "instrumentation"],
    ["@nestjs/instrumentation", "instrumentation"],
    // The instrumented libraries themselves keep their real category.
    ["@prisma/client", "orm"],
    ["prisma", "orm"],
    ["fastify", "web-http"],
    ["express", "web-http"],
  ] as const)("%s -> %s", (name, category) => {
    expect(dependencyCategory(name)).toBe(category);
  });
});
