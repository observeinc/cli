import { describe, expect, test } from "bun:test";
import {
  BOT_LOGIN,
  COUNTS_FILE,
  PR_BRANCH,
  PR_LABEL,
  main,
  refuseReason,
  type MergeGate,
} from "./eval-coverage-automerge";

const ok: MergeGate = {
  repo: "observeinc/cli",
  headRepo: "observeinc/cli",
  headRef: PR_BRANCH,
  author: BOT_LOGIN,
  labels: [PR_LABEL],
  files: [COUNTS_FILE],
};

describe("refuseReason", () => {
  test("allows the bot counts PR", () => {
    expect(refuseReason(ok)).toBeUndefined();
  });

  test("refuses a fork", () => {
    expect(refuseReason({ ...ok, headRepo: "alice/cli" })).toContain(
      "alice/cli",
    );
  });

  test("refuses another author", () => {
    expect(refuseReason({ ...ok, author: "alice" })).toContain("alice");
  });

  test("refuses another branch", () => {
    expect(refuseReason({ ...ok, headRef: "feat/x" })).toContain("feat/x");
  });

  test("refuses a missing label", () => {
    expect(refuseReason({ ...ok, labels: [] })).toContain(PR_LABEL);
  });

  test("refuses extra files", () => {
    expect(
      refuseReason({ ...ok, files: [COUNTS_FILE, ".github/workflows/ci.yml"] }),
    ).toContain(".github/workflows/ci.yml");
  });

  test("refuses an empty file list", () => {
    expect(refuseReason({ ...ok, files: [] })).toContain("(none)");
  });
});

describe("main", () => {
  test("exits 0 when the gate passes", () => {
    expect(
      main([
        "--repo",
        ok.repo,
        "--head-repo",
        ok.headRepo,
        "--head-ref",
        ok.headRef,
        "--author",
        ok.author,
        "--label",
        PR_LABEL,
        "--file",
        COUNTS_FILE,
      ]),
    ).toBe(0);
  });

  test("exits 2 when the gate refuses", () => {
    expect(
      main([
        "--repo",
        ok.repo,
        "--head-repo",
        ok.repo,
        "--head-ref",
        ok.headRef,
        "--author",
        "alice",
        "--label",
        PR_LABEL,
        "--file",
        COUNTS_FILE,
      ]),
    ).toBe(2);
  });

  test("exits 1 without required flags", () => {
    expect(main([])).toBe(1);
  });
});
