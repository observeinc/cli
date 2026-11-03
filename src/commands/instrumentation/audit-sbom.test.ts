import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createMockContext, suppressAnsiColor } from "../../test-helpers";
import { audit, type AuditReport } from "./audit";

type AuditFlags = Parameters<typeof audit>[0];

suppressAnsiColor();

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

function project(files: Record<string, string>) {
  const root = mkdtempSync(join(tmpdir(), "obs-audit-sbom-"));
  dirs.push(root);
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

const springApp = {
  "pom.xml":
    "<project><artifactId>payments</artifactId><properties><java.version>21</java.version></properties><dependencies><dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId><version>3.3.2</version></dependency></dependencies></project>",
  "src/main/java/App.java":
    "@SpringBootApplication public class App { public static void main(String[] a) {} }",
};

const mavenSbom = JSON.stringify({
  bomFormat: "CycloneDX",
  specVersion: "1.6",
  metadata: {
    component: { type: "application", name: "payments", "bom-ref": "app" },
  },
  components: [
    {
      type: "library",
      "bom-ref": "pkg:maven/org.apache.tomcat.embed/tomcat-embed-core@10.1.26",
      name: "tomcat-embed-core",
      version: "10.1.26",
      purl: "pkg:maven/org.apache.tomcat.embed/tomcat-embed-core@10.1.26",
    },
  ],
  dependencies: [
    {
      ref: "app",
      dependsOn: [
        "pkg:maven/org.apache.tomcat.embed/tomcat-embed-core@10.1.26",
      ],
    },
  ],
});

async function run(root: string, flags: Partial<AuditFlags> = {}) {
  const { context, stdout } = createMockContext({ cwd: root });
  await audit.call(
    context,
    { format: "json", "fail-on": "none", ...flags },
    ".",
  );
  return JSON.parse(stdout.join("")) as AuditReport;
}

describe("audit with a CycloneDX SBOM", () => {
  test("records the SHA-256 of an SBOM passed with --sbom", async () => {
    const root = project({ ...springApp, "build/payments.json": mavenSbom });
    const report = await run(root, {
      app: ".",
      sbom: join(root, "build/payments.json"),
    });
    expect(report.candidates[0]?.dependencyGraph?.provenance.sha256).toBe(
      createHash("sha256").update(mavenSbom).digest("hex"),
    );
  });

  test("uses an SBOM only when --sbom is passed", async () => {
    const report = await run(project({ ...springApp, "bom.json": mavenSbom }));
    expect(report.candidates[0]?.dependencyGraph).toBeUndefined();
  });
});
