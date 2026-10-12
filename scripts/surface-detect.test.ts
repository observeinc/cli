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
