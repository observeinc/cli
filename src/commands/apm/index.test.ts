import { describe, expect, test } from "bun:test";
import { isExperimental } from "../../lib/experimental";
import { apmRoutes } from "./index";
import { environmentsCommand } from "./environments";
import { invocationGraphCommand } from "./invocation-graph";
import { servicesCommand } from "./services";

describe("apm routes", () => {
  test("the whole group is not experimental", () => {
    expect(isExperimental(apmRoutes)).toBe(false);
  });

  test("each command is not experimental", () => {
    expect(isExperimental(servicesCommand)).toBe(false);
    expect(isExperimental(environmentsCommand)).toBe(false);
    expect(isExperimental(invocationGraphCommand)).toBe(false);
  });
});
