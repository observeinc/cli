import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  commandTree,
  contractRanges,
  detect,
  markdown,
  routeEntries,
  type Surface,
} from "./surface-detect";

const APP = `import { defineRoutes } from "./lib/stricli-wrappers.js";
import { apmRoutes } from "./commands/apm/index.js";
import { queryCommand } from "./commands/query.js";

export const routes = defineRoutes({
  routes: {
    // Kept for old scripts: query: nope
    apm: apmRoutes,
    query: queryCommand,
  },
  docs: { brief: "Observe CLI" },
});
`;

const APM = `import { buildRouteMap } from "@stricli/core";
import { servicesCommand } from "./services";

export const apmRoutes = buildRouteMap({
  routes: {
    services: servicesCommand,
  },
  docs: { brief: "APM" },
});
`;

const SERVICES = `import { defineCommand } from "../../lib/stricli-wrappers";

async function run(limit: number) {
  return limit + 1;
}

export const servicesCommand = defineCommand({
  loader: async () => run,
  parameters: {
    flags: {
      limit: { kind: "parsed", brief: "Max rows" },
    },
  },
  docs: {
    brief: "List services",
  },
});
`;

const QUERY = SERVICES.replace("servicesCommand", "queryCommand");

let dir: string;
const git = (...args: string[]) =>
  execFileSync("git", args, { cwd: dir, encoding: "utf-8" }).trim();
const write = (file: string, text: string) => {
  mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
  writeFileSync(path.join(dir, file), text);
};
const commit = () => {
  git("add", "-A");
  git("commit", "-q", "--allow-empty", "-m", "c");
  return git("rev-parse", "HEAD");
};
const byName = (s: Surface[]) => Object.fromEntries(s.map((x) => [x.name, x]));

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "surface-detect-"));
  git("init", "-q", "-b", "main");
  git("config", "user.email", "t@example.com");
  git("config", "user.name", "t");
  write("src/app.ts", APP);
  write("src/commands/apm/index.ts", APM);
  write("src/commands/apm/services.ts", SERVICES);
  write("src/commands/query.ts", QUERY);
  write("src/lib/stricli-wrappers.ts", "export const x = 1;\n");
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("routeEntries", () => {
  test("reads route keys and ignores comments", () => {
    expect(routeEntries(APP, "routes")).toEqual([
      ["apm", "apmRoutes"],
      ["query", "queryCommand"],
    ]);
  });
});

describe("commandTree", () => {
  test("walks nested route maps", () => {
    const base = commit();
    expect(Object.fromEntries(commandTree(base, dir))).toEqual({
      "apm services": "src/commands/apm/services.ts",
      query: "src/commands/query.ts",
    });
  });
});

describe("contractRanges", () => {
  test("covers parameters and docs blocks", () => {
    const ranges = contractRanges(SERVICES);
    const lines = SERVICES.split("\n");
    const flagLine = lines.findIndex((l) => l.includes("Max rows")) + 1;
    const bodyLine = lines.findIndex((l) => l.includes("limit + 1")) + 1;
    expect(ranges.some(([a, b]) => flagLine >= a && flagLine <= b)).toBe(true);
    expect(ranges.some(([a, b]) => bodyLine >= a && bodyLine <= b)).toBe(false);
  });
});

describe("detect", () => {
  test("no command change", () => {
    const base = commit();
    write("README.md", "hi\n");
    expect(detect(base, commit(), dir)).toEqual([]);
  });

  test("flag edit is contract, body edit is impl", () => {
    const base = commit();
    write(
      "src/commands/apm/services.ts",
      SERVICES.replace("Max rows", "Maximum rows"),
    );
    write("src/commands/query.ts", QUERY.replace("limit + 1", "limit + 2"));
    const got = byName(detect(base, commit(), dir));
    expect(got["apm services"]?.tags).toEqual(["contract"]);
    expect(got.query?.tags).toEqual(["impl"]);
  });

  test("whitespace-only edit is impl", () => {
    const base = commit();
    write(
      "src/commands/apm/services.ts",
      SERVICES.replace('brief: "Max rows"', 'brief:   "Max rows"'),
    );
    expect(byName(detect(base, commit(), dir))["apm services"]?.tags).toEqual([
      "impl",
    ]);
  });

  test("added and removed commands", () => {
    const base = commit();
    write(
      "src/commands/apm/envs.ts",
      SERVICES.replace("servicesCommand", "envsCommand"),
    );
    write(
      "src/commands/apm/index.ts",
      APM.replace(
        'import { servicesCommand } from "./services";',
        'import { envsCommand } from "./envs";',
      ).replace("services: servicesCommand", "environments: envsCommand"),
    );
    const got = byName(detect(base, commit(), dir));
    expect(got["apm environments"]?.change).toBe("added");
    expect(got["apm services"]?.change).toBe("removed");
  });

  test("shared code is indirect and tests are ignored", () => {
    const base = commit();
    write("src/lib/stricli-wrappers.ts", "export const x = 2;\n");
    write("src/commands/query.test.ts", "test('x', () => {});\n");
    const got = detect(base, commit(), dir);
    expect(got).toHaveLength(1);
    expect(got[0]?.tags).toEqual(["indirect"]);
    expect(got[0]?.name).toBe("(shared src/lib)");
  });
});

describe("detect: helpers and route maps", () => {
  test("a changed helper marks the commands that import it", () => {
    write(
      "src/commands/apm/utils.ts",
      "export const parseLimit = (n: number) => n;\n",
    );
    write(
      "src/commands/apm/services.ts",
      `import { parseLimit } from "./utils";\n${SERVICES}`,
    );
    const base = commit();
    write(
      "src/commands/apm/utils.ts",
      "export const parseLimit = (n: number) => n + 1;\n",
    );
    const got = byName(detect(base, commit(), dir));
    expect(got["apm services"]?.tags).toEqual(["impl"]);
    expect(got["apm services"]?.files).toEqual(["src/commands/apm/utils.ts"]);
    expect(Object.keys(got).some((k) => k.startsWith("(shared"))).toBe(false);
  });

  test("an index.ts import-only edit is impl", () => {
    const base = commit();
    write(
      "src/commands/apm/index.ts",
      APM.replace('from "./services"', 'from "./services.js"'),
    );
    expect(byName(detect(base, commit(), dir)).apm?.tags).toEqual(["impl"]);
  });

  test("group docs edit stays when a child is only impl", () => {
    const base = commit();
    write(
      "src/commands/apm/index.ts",
      APM.replace('brief: "APM"', 'brief: "APM tools"'),
    );
    write(
      "src/commands/apm/services.ts",
      SERVICES.replace("limit + 1", "limit + 2"),
    );
    const got = byName(detect(base, commit(), dir));
    expect(got["apm services"]?.tags).toEqual(["impl"]);
    expect(got.apm?.tags).toEqual(["contract"]);
  });

  test("root app.ts and other src files are reported", () => {
    const base = commit();
    write(
      "src/app.ts",
      APP.replace('brief: "Observe CLI"', 'brief: "observe"'),
    );
    write("src/context.ts", "export const c = 1;\n");
    const got = byName(detect(base, commit(), dir));
    expect(got["(root)"]?.tags).toEqual(["contract"]);
    expect(got["(shared src)"]?.tags).toEqual(["indirect"]);
  });
});

describe("detect: contract reach", () => {
  test("a top-level constant used in a flag brief is contract", () => {
    write(
      "src/commands/query.ts",
      `const FIELDS = ["a", "b"];\n${QUERY.replace('brief: "Max rows"', "brief: `Fields: ${FIELDS.join()}`")}`,
    );
    const base = commit();
    write(
      "src/commands/query.ts",
      `const FIELDS = ["a", "b", "c"];\n${QUERY.replace('brief: "Max rows"', "brief: `Fields: ${FIELDS.join()}`")}`,
    );
    expect(byName(detect(base, commit(), dir)).query?.tags).toEqual([
      "contract",
    ]);
  });

  test("buildApplication options in app.ts are contract", () => {
    write(
      "src/app.ts",
      `${APP}export const app = buildApplication(routes, {\n  scanner: { caseStyle: "original" },\n});\n`,
    );
    const base = commit();
    write(
      "src/app.ts",
      `${APP}export const app = buildApplication(routes, {\n  scanner: { caseStyle: "allow-kebab-for-camel" },\n});\n`,
    );
    expect(byName(detect(base, commit(), dir))["(root)"]?.tags).toEqual([
      "contract",
    ]);
  });

  test("a hideRoute change survives an added sibling", () => {
    const base = commit();
    write(
      "src/commands/apm/envs.ts",
      SERVICES.replace("servicesCommand", "envsCommand"),
    );
    write(
      "src/commands/apm/index.ts",
      APM.replace(
        'import { servicesCommand } from "./services";',
        'import { servicesCommand } from "./services";\nimport { envsCommand } from "./envs";',
      )
        .replace(
          "services: servicesCommand,",
          "services: servicesCommand,\n    envs: envsCommand,",
        )
        .replace(
          'docs: { brief: "APM" }',
          'docs: { brief: "APM" },\n  hideRoute: { services: true }',
        ),
    );
    const got = byName(detect(base, commit(), dir));
    expect(got["apm envs"]?.change).toBe("added");
    expect(got.apm?.tags).toEqual(["contract"]);
  });

  test("a new group is reported only through its added commands", () => {
    const base = commit();
    write(
      "src/commands/inc/list.ts",
      SERVICES.replace("servicesCommand", "listCommand"),
    );
    write(
      "src/commands/inc/index.ts",
      'import { buildRouteMap } from "@stricli/core";\nimport { listCommand } from "./list";\n\nexport const incRoutes = buildRouteMap({\n  routes: {\n    list: listCommand,\n  },\n  docs: { brief: "Incidents" },\n});\n',
    );
    write(
      "src/app.ts",
      APP.replace(
        'import { queryCommand } from "./commands/query.js";',
        'import { queryCommand } from "./commands/query.js";\nimport { incRoutes } from "./commands/inc/index.js";',
      ).replace(
        "    query: queryCommand,",
        "    query: queryCommand,\n    inc: incRoutes,",
      ),
    );
    const got = byName(detect(base, commit(), dir));
    expect(got["inc list"]?.change).toBe("added");
    expect(got.inc).toBeUndefined();
  });

  test("an unwired new group adds no command rows", () => {
    const base = commit();
    write(
      "src/commands/inc/list.ts",
      SERVICES.replace("servicesCommand", "listCommand"),
    );
    write(
      "src/commands/inc/index.ts",
      'import { buildRouteMap } from "@stricli/core";\nimport { listCommand } from "./list";\n\nexport const incRoutes = buildRouteMap({\n  routes: {\n    list: listCommand,\n  },\n  docs: { brief: "Incidents" },\n});\n',
    );
    const got = byName(detect(base, commit(), dir));
    expect(Object.keys(got).filter((k) => k.startsWith("inc"))).toEqual([]);
  });

  test("a moved command is a change only if its content changed", () => {
    const base = commit();
    write("src/commands/apm/svc/services.ts", SERVICES);
    rmSync(path.join(dir, "src/commands/apm/services.ts"));
    write(
      "src/commands/apm/index.ts",
      APM.replace('from "./services"', 'from "./svc/services"'),
    );
    expect(byName(detect(base, commit(), dir))["apm services"]).toBeUndefined();
    const moved = commit();
    write(
      "src/commands/apm/svc/services.ts",
      SERVICES.replace("Max rows", "Maximum rows"),
    );
    expect(byName(detect(moved, commit(), dir))["apm services"]?.tags).toEqual([
      "contract",
    ]);
  });

  test("a routes-only edit is explained by the added child", () => {
    const base = commit();
    write(
      "src/commands/apm/envs.ts",
      SERVICES.replace("servicesCommand", "envsCommand"),
    );
    write(
      "src/commands/apm/index.ts",
      APM.replace(
        'import { servicesCommand } from "./services";',
        'import { servicesCommand } from "./services";\nimport { envsCommand } from "./envs";',
      ).replace(
        "services: servicesCommand,",
        "services: servicesCommand,\n    envs: envsCommand,",
      ),
    );
    const got = byName(detect(base, commit(), dir));
    expect(got["apm envs"]?.change).toBe("added");
    expect(got.apm).toBeUndefined();
  });
});

describe("markdown", () => {
  test("empty when nothing found", () => {
    expect(markdown([])).toBe("");
  });

  test("contract rows first", () => {
    const md = markdown([
      { kind: "cli", name: "a", change: "modified", tags: ["impl"], files: [] },
      {
        kind: "cli",
        name: "b",
        change: "added",
        tags: ["contract"],
        files: [],
      },
    ]);
    expect(md).toContain("2 CLI command surface(s), 1 with a contract change");
    expect(md.indexOf("observe b")).toBeLessThan(md.indexOf("observe a"));
  });
});
