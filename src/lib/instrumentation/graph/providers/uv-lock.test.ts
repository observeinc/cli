import { describe, expect, test } from "bun:test";
import { buildUvGraph } from "./uv-lock";
import { runtimeClosure } from "../traverse";
import type { CandidateApplication } from "../../types";

const candidate = {
  id: "python:service/semantic_search",
  path: "service/semantic_search",
  name: "semantic_search",
  language: { id: "python" },
  runtime: { id: "python" },
  frameworks: [],
  lockfiles: [],
  entrypoints: [],
  dependencies: [],
  testFrameworks: [],
  containerFiles: [],
  deploymentFiles: [],
  evidence: [],
  diagnostics: [],
} satisfies CandidateApplication;

const lock = `
version = 1
[[package]]
name = "semantic-search"
version = "0.0.0"
source = { editable = "." }
dependencies = [{ name = "boto3" }, { name = "o11y-service" }]
[package.dev-dependencies]
dev = [{ name = "pytest" }]

[[package]]
name = "o11y-service"
version = "0.0.0"
source = { editable = "../../libs/o11y_service" }
dependencies = [{ name = "aiohttp" }, { name = "boto3" }, { name = "fastapi" }, { name = "uvicorn" }]

[[package]]
name = "boto3"
version = "1.40.0"
source = { registry = "https://pypi.org/simple" }
[[package]]
name = "aiohttp"
version = "3.13.3"
source = { registry = "https://pypi.org/simple" }
[[package]]
name = "fastapi"
version = "0.111.1"
source = { registry = "https://pypi.org/simple" }
[[package]]
name = "uvicorn"
version = "0.30.6"
source = { registry = "https://pypi.org/simple" }
[[package]]
name = "pytest"
version = "8.0.0"
source = { registry = "https://pypi.org/simple" }
`;

describe("uvLockProvider", () => {
  test.each([true, false])(
    "requested extras are expanded or marked partial: %s",
    (hasExtra) => {
      const content =
        lock.replace(
          '{ name = "boto3" }, { name = "o11y-service" }',
          '{ name = "boto3", extra = ["crt"] }, { name = "o11y-service" }',
        ) +
        (hasExtra ? '\n[[package]]\nname = "awscrt"\nversion = "1.0.0"\n' : "");
      const withExtras = content.replace(
        'name = "boto3"\nversion = "1.40.0"',
        'name = "boto3"\noptional-dependencies = { crt = [{ name = "awscrt" }] }\nversion = "1.40.0"',
      );
      const graph = buildUvGraph({
        candidate,
        snapshot: {
          root: "/repo",
          diagnostics: [],
          files: [
            {
              path: "service/semantic_search/uv.lock",
              content: withExtras,
              size: withExtras.length,
            },
          ],
          completeness: {
            filesSeen: 1,
            directoriesSeen: 1,
            manifestsSeen: 1,
            manifestsParsed: 0,
            manifestsFailed: 0,
            lockfilesSeen: 1,
            filesSkippedBySize: 0,
            unreadableFiles: 0,
            permissionErrors: 0,
            limitReached: false,
          },
        },
      });
      if (graph == null) throw new Error("Missing graph");
      expect(graph.completeness).toBe(
        hasExtra ? "resolved-graph" : "partial-graph",
      );
      expect(
        runtimeClosure(graph).some((item) => item.node.name === "awscrt"),
      ).toBe(hasExtra);
    },
  );

  test("builds a rooted runtime graph through editable dependencies", () => {
    const graph = buildUvGraph({
      candidate,
      snapshot: {
        root: "/repo",
        files: [
          {
            path: "service/semantic_search/uv.lock",
            size: lock.length,
            content: lock,
          },
        ],
        diagnostics: [],
        completeness: {
          filesSeen: 1,
          directoriesSeen: 1,
          manifestsSeen: 1,
          manifestsParsed: 0,
          manifestsFailed: 0,
          lockfilesSeen: 1,
          filesSkippedBySize: 0,
          unreadableFiles: 0,
          permissionErrors: 0,
          limitReached: false,
        },
      },
    })!;
    expect(graph.completeness).toBe("resolved-graph");
    const closure = runtimeClosure(graph);
    expect(closure.map((item) => item.node.name)).toEqual([
      "boto3",
      "o11y-service",
      "aiohttp",
      "fastapi",
      "uvicorn",
    ]);
    expect(
      closure
        .find((item) => item.node.name === "fastapi")
        ?.path.map((id) => graph.nodes.get(id)?.name),
    ).toEqual(["semantic-search", "o11y-service", "fastapi"]);
    expect(
      closure.find((item) => item.node.name === "boto3")?.parents,
    ).toHaveLength(2);
    expect(closure.some((item) => item.node.name === "pytest")).toBe(false);
  });
});
