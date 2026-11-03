import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createMockContext, suppressAnsiColor } from "../../test-helpers";
import { audit, type AuditReport } from "./audit";

suppressAnsiColor();

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

function project(files: Record<string, string>) {
  const root = mkdtempSync(join(tmpdir(), "obs-audit-app-scope-"));
  dirs.push(root);
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

async function run(root: string, app?: string) {
  const { context, stdout } = createMockContext({ cwd: root });
  await audit.call(
    context,
    { format: "json", "fail-on": "none", ...(app == null ? {} : { app }) },
    ".",
  );
  return JSON.parse(stdout.join("")) as AuditReport;
}

describe("an unknown --app in a large project", () => {
  const services = Object.fromEntries(
    Array.from({ length: 12 }, (_, index) => [
      `svc-${String(index + 1).padStart(2, "0")}/package.json`,
      JSON.stringify({
        name: `svc-${index + 1}`,
        scripts: { start: "node ." },
      }),
    ]),
  );
  const errorFor = async (app: string) => {
    const { context, stderr } = createMockContext({ cwd: project(services) });
    await audit.call(context, { format: "json", app }, ".");
    return JSON.parse(stderr.join("")).error.message as string;
  };

  test("lists only the ids containing what was typed", async () => {
    expect(await errorFor("svc-1")).toEndWith(
      'Ids containing "svc-1": svc-10, svc-11, svc-12',
    );
  });

  test("points to the full list when nothing matches", async () => {
    expect(await errorFor("billing")).toEndWith(
      "run without --app to list all 12 application ids.",
    );
  });
});

test("--app shows only project diagnostics from the selected application's directory", async () => {
  const root = project({
    "svc/package.json": JSON.stringify({
      name: "svc",
      engines: { node: "22" },
      scripts: { start: "node index.js" },
    }),
    "MODULE.bazel": 'module(name = "root")',
    "native/BUILD.bazel": 'cc_binary(name = NAME, srcs = ["main.cc"])',
  });
  const codes = (report: AuditReport) =>
    report.diagnostics.map((diagnostic) => diagnostic.code);
  expect(codes(await run(root))).toContain("DYNAMIC_TARGET_NAME");
  expect(codes(await run(root, "svc"))).not.toContain("DYNAMIC_TARGET_NAME");
});
