import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { classify, detect, markdown, type Surface } from "./surface-detect";
import type { Dump, DumpedSurface } from "./surface-dump";

const byName = (s: Surface[]) => Object.fromEntries(s.map((x) => [x.name, x]));

const cmd = (
  file: string,
  brief: string,
  closure: string[] = [],
): DumpedSurface => ({ kind: "command", file, closure, contract: { brief } });
const group = (file: string, brief: string): DumpedSurface => ({
  kind: "group",
  file,
  closure: [],
  contract: { brief },
});

const BASE: Dump = {
  "(root)": group("src/app.ts", "Observe CLI"),
  apm: group("src/commands/apm/index.ts", "APM"),
  "apm services": cmd("src/commands/apm/services.ts", "List services", [
    "src/commands/apm/apm-utils.ts",
    "src/lib/time-window.ts",
  ]),
  query: cmd("src/commands/query.ts", "Run a query", [
    "src/lib/time-window.ts",
  ]),
};

const withSurface = (name: string, s: DumpedSurface | undefined): Dump => {
  const next = { ...BASE };
  if (s) next[name] = s;
  else Reflect.deleteProperty(next, name);
  return next;
};

describe("classify", () => {
  test("nothing changed", () => {
    expect(classify(BASE, BASE, [])).toEqual([]);
  });

  test("a contract change is contract", () => {
    const after = withSurface(
      "query",
      cmd("src/commands/query.ts", "Run an OPAL query", [
        "src/lib/time-window.ts",
      ]),
    );
    expect(classify(BASE, after, ["src/commands/query.ts"])).toEqual([
      {
        kind: "cli",
        name: "query",
        change: "modified",
        tags: ["contract"],
        files: ["src/commands/query.ts"],
      },
    ]);
  });

  test("own file or a src/commands helper is impl", () => {
    const got = byName(
      classify(BASE, BASE, [
        "src/commands/query.ts",
        "src/commands/apm/apm-utils.ts",
      ]),
    );
    expect(got.query?.tags).toEqual(["impl"]);
    expect(got["apm services"]?.tags).toEqual(["impl"]);
    expect(got["apm services"]?.files).toEqual([
      "src/commands/apm/apm-utils.ts",
    ]);
  });

  test("a shared lib file is indirect on every command importing it", () => {
    const got = byName(classify(BASE, BASE, ["src/lib/time-window.ts"]));
    expect(Object.keys(got).sort()).toEqual(["apm services", "query"]);
    expect(got.query?.tags).toEqual(["indirect"]);
  });

  test("added and removed commands are contract", () => {
    const after = withSurface("query", undefined);
    after["apm envs"] = cmd("src/commands/apm/envs.ts", "List environments");
    const got = byName(
      classify(BASE, after, [
        "src/app.ts",
        "src/commands/apm/envs.ts",
        "src/commands/apm/index.ts",
        "src/commands/query.ts",
      ]),
    );
    expect(got["apm envs"]?.change).toBe("added");
    expect(got.query?.change).toBe("removed");
    // Route maps that only wire those children in or out add no row.
    expect(got.apm).toBeUndefined();
    expect(got["(root)"]).toBeUndefined();
  });

  test("a group edit with no child change is impl, a docs change contract", () => {
    expect(
      byName(classify(BASE, BASE, ["src/commands/apm/index.ts"])).apm?.tags,
    ).toEqual(["impl"]);
    const after = withSurface(
      "apm",
      group("src/commands/apm/index.ts", "Tracing"),
    );
    expect(
      byName(classify(BASE, after, ["src/commands/apm/index.ts"])).apm?.tags,
    ).toEqual(["contract"]);
  });

  test("src files no command imports form one shared row", () => {
    expect(classify(BASE, BASE, ["src/bin.ts", "README.md"])).toEqual([
      {
        kind: "cli",
        name: "(shared src)",
        change: "modified",
        tags: ["indirect"],
        files: ["src/bin.ts"],
      },
    ]);
  });
});

// End to end: a tiny Stricli app in a temp repo, dumped at two commits.
const STRICLI = path.resolve(import.meta.dir, "../node_modules");

const APP = `import { buildApplication, buildRouteMap } from "@stricli/core";
import { apmRoutes } from "./commands/apm/index.js";
import { queryCommand } from "./commands/query.js";

export const routes = buildRouteMap({
  routes: { apm: apmRoutes, query: queryCommand },
  docs: { brief: "Observe CLI" },
});

export const app = buildApplication(routes, { name: "observe" });
`;

const APM = `import { buildRouteMap } from "@stricli/core";
import { servicesCommand } from "./services.js";

export const apmRoutes = buildRouteMap({
  routes: { services: servicesCommand },
  docs: { brief: "APM" },
});
`;

const TIME_WINDOW = `export const timeWindowFlags = {
  start: { kind: "parsed", parse: String, brief: "Window start", optional: true },
} as const;
`;

const command = (
  ident: string,
  brief: string,
  body = "return;",
) => `import { buildCommand } from "@stricli/core";
import { timeWindowFlags } from "IMPORT";

export const ${ident} = buildCommand({
  func: () => {
    ${body}
  },
  parameters: {
    flags: {
      ...timeWindowFlags,
      limit: { kind: "parsed", parse: Number, brief: "Max rows", optional: true },
    },
  },
  docs: { brief: "${brief}" },
});
`;

const SERVICES = command("servicesCommand", "List services").replace(
  "IMPORT",
  "../../lib/time-window.js",
);
const QUERY = command("queryCommand", "Run a query").replace(
  "IMPORT",
  "../lib/time-window.js",
);

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

describe("detect (end to end)", () => {
  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "surface-detect-"));
    git("init", "-q", "-b", "main");
    git("config", "user.email", "t@example.com");
    git("config", "user.name", "t");
    symlinkSync(STRICLI, path.join(dir, "node_modules"));
    write(".gitignore", "node_modules\n");
    write("src/app.ts", APP);
    write("src/commands/apm/index.ts", APM);
    write("src/commands/apm/services.ts", SERVICES);
    write("src/commands/query.ts", QUERY);
    write("src/lib/time-window.ts", TIME_WINDOW);
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test("a shared flag set brief edit is contract on every user", () => {
    const base = commit();
    write(
      "src/lib/time-window.ts",
      TIME_WINDOW.replace("Window start", "Start (ISO 8601)"),
    );
    const got = byName(detect(base, commit(), dir));
    expect(got.query?.tags).toEqual(["contract"]);
    expect(got["apm services"]?.tags).toEqual(["contract"]);
    expect(got["apm services"]?.files).toEqual([
      "src/commands/apm/services.ts",
      "src/lib/time-window.ts",
    ]);
  });

  test("a body edit is impl and a lib helper edit indirect", () => {
    write("src/lib/fmt.ts", "export const fmt = (n: number) => String(n);\n");
    write(
      "src/commands/query.ts",
      `import { fmt } from "../lib/fmt.js";\n${QUERY.replace("return;", "fmt(1);")}`,
    );
    const base = commit();
    write(
      "src/commands/apm/services.ts",
      SERVICES.replace("return;", "return undefined;"),
    );
    write(
      "src/lib/fmt.ts",
      "export const fmt = (n: number) => n.toFixed(0);\n",
    );
    const got = byName(detect(base, commit(), dir));
    expect(got["apm services"]?.tags).toEqual(["impl"]);
    expect(got.query?.tags).toEqual(["indirect"]);
  });

  test("hiding a route is contract on the hidden command", () => {
    const base = commit();
    write(
      "src/commands/apm/index.ts",
      APM.replace(
        'docs: { brief: "APM" }',
        'docs: { brief: "APM", hideRoute: { services: true } }',
      ),
    );
    const got = byName(detect(base, commit(), dir));
    expect(got["apm services"]?.tags).toEqual(["contract"]);
    expect(got.apm?.tags).toEqual(["impl"]);
  });

  test("an identical move reports only the rewired group", () => {
    const base = commit();
    git("mv", "src/commands/query.ts", "src/commands/run-query.ts");
    write(
      "src/app.ts",
      APP.replace("./commands/query.js", "./commands/run-query.js"),
    );
    expect(detect(base, commit(), dir)).toEqual([
      {
        kind: "cli",
        name: "(root)",
        change: "modified",
        tags: ["impl"],
        files: ["src/app.ts"],
      },
    ]);
  });

  test("a renamed route is a removed and an added command", () => {
    const base = commit();
    write(
      "src/app.ts",
      APP.replace("query: queryCommand", "run: queryCommand"),
    );
    const got = byName(detect(base, commit(), dir));
    expect(got.query?.change).toBe("removed");
    expect(got.run?.change).toBe("added");
    expect(got["(root)"]).toBeUndefined();
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
    const rows = md.split("\n").filter((l) => l.startsWith("| `"));
    expect(rows[0]).toContain("observe b");
    expect(md).toContain("1 with a contract change");
  });
});
