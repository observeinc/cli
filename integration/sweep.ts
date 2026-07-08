#!/usr/bin/env bun
/**
 * Deletes orphaned integration-test resources left on the tenant by crashed or
 * interrupted runs. Resources are matched by name/label prefix (default
 * `^cli-`, the prefix `testPrefix()` applies) — modeled on the
 * terraform-provider-observe acceptance-test sweepers.
 *
 * Usage:
 *   bun run test:integration:sweep            # delete everything matching ^cli-
 *   bun run test:integration:sweep -- --dry-run
 *   bun run test:integration:sweep -- --pattern '^cli-a1b2'
 *
 * See integration/README.md.
 */
import { parseArgs } from "node:util";
import { searchIngestToken } from "../src/gql/ingest-token/search-ingest-token";
import { listDatastreams } from "../src/gql/datastream/list-datastreams";
import { listDatasets } from "../src/rest/dataset/list-datasets";
import { listSkills } from "../src/rest/skill/list-skills";
import type { Config } from "../src/lib/config";
import {
  deleteDataset,
  deleteDatastream,
  deleteIngestToken,
  deleteSkill,
} from "./cleanup";
import { TEST_RESOURCE_PREFIX, loadTenantConfig } from "./fixture";

// Requested page size for paginated REST lists. Kept at the dataset endpoint's
// documented maximum (100); `paginate` advances by the actual page length, so a
// smaller server-honored cap only costs extra round trips, never correctness.
const PAGE_SIZE = 100;

interface ResourceRef {
  id: string;
  name: string;
}

interface Sweeper {
  /** Resource type, for logging. */
  type: string;
  list: (config: Config) => Promise<ResourceRef[]>;
  remove: (config: Config, id: string) => Promise<void>;
}

/**
 * Sweepers run in dependency order: datastreams before datasets (a datastream's
 * direct-write targets are datasets), mirroring the terraform-provider ordering.
 */
const SWEEPERS: readonly Sweeper[] = [
  {
    type: "datastream",
    list: async (config) =>
      (await listDatastreams(config)).map((d) => ({ id: d.id, name: d.name })),
    remove: deleteDatastream,
  },
  {
    type: "dataset",
    list: (config) =>
      paginate(async (offset) => {
        const { datasets } = await listDatasets({
          config,
          limit: PAGE_SIZE,
          offset,
        });
        return datasets.map((d) => ({ id: d.id, name: d.label }));
      }),
    remove: deleteDataset,
  },
  {
    type: "ingest-token",
    list: async (config) =>
      (await searchIngestToken(config)).map((t) => ({
        id: t.id,
        name: t.name,
      })),
    remove: deleteIngestToken,
  },
  {
    type: "skill",
    list: (config) =>
      paginate(async (offset) => {
        const { skills } = await listSkills({
          config,
          limit: PAGE_SIZE,
          offset,
        });
        return skills.map((s) => ({ id: s.id, name: s.label }));
      }),
    remove: (config, id) => deleteSkill(config, id),
  },
];

interface SweepOptions {
  pattern: RegExp;
  dryRun: boolean;
}

async function main(): Promise<void> {
  const options = parseOptions();
  const config = loadTenantConfig();

  console.log(
    `[sweep] matching /${options.pattern.source}/${options.dryRun ? " (dry run)" : ""}`,
  );

  let deleted = 0;
  let failed = 0;

  for (const sweeper of SWEEPERS) {
    let resources: ResourceRef[];
    try {
      resources = (await sweeper.list(config)).filter((r) =>
        options.pattern.test(r.name),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[sweep] failed to list ${sweeper.type}s: ${message}`);
      failed += 1;
      continue;
    }

    for (const resource of resources) {
      const label = `${sweeper.type} ${resource.name} [id=${resource.id}]`;
      if (options.dryRun) {
        console.log(`[sweep] would delete ${label}`);
        continue;
      }
      try {
        await sweeper.remove(config, resource.id);
        console.log(`[sweep] deleted ${label}`);
        deleted += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[sweep] failed to delete ${label}: ${message}`);
        failed += 1;
      }
    }
  }

  console.log(
    `[sweep] done: ${String(deleted)} deleted, ${String(failed)} failed`,
  );
  if (failed > 0) {
    process.exitCode = 1;
  }
}

function parseOptions(): SweepOptions {
  const { values } = parseArgs({
    options: {
      pattern: { type: "string" },
      "dry-run": { type: "boolean", default: false },
    },
  });

  // Fall back to the default for an empty/whitespace-only --pattern; parseArgs
  // yields "" (not undefined) there, and `new RegExp("")` would match every
  // resource, defeating the prefix safeguard.
  const source = values.pattern?.trim()
    ? values.pattern
    : `^${TEST_RESOURCE_PREFIX}-`;
  let pattern: RegExp;
  try {
    pattern = new RegExp(source);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`invalid --pattern ${JSON.stringify(source)}: ${message}`, {
      cause: error,
    });
  }

  return { pattern, dryRun: values["dry-run"] };
}

/**
 * Collect all pages by advancing offset until an empty page is returned.
 * Advances by the actual page length (not the requested size) so a server that
 * caps the page below `PAGE_SIZE` still paginates correctly instead of stopping
 * early or skipping records.
 */
async function paginate(
  fetchPage: (offset: number) => Promise<ResourceRef[]>,
): Promise<ResourceRef[]> {
  const all: ResourceRef[] = [];
  let offset = 0;
  for (;;) {
    const page = await fetchPage(offset);
    if (page.length === 0) {
      return all;
    }
    all.push(...page);
    offset += page.length;
  }
}

await main();
