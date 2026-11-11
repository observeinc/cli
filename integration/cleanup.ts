/**
 * API teardown helpers for integration tests — not part of the CLI surface under test.
 *
 * Register these with `fixture.registerCleanup()`; assertions belong on CLI output only.
 */

import { deleteDatastream as gqlDeleteDatastream } from "../src/gql/datastream/delete-datastream";
import { deleteDataset as gqlDeleteDataset } from "../src/gql/dataset/delete-dataset";
import { untrackShareTable } from "../src/rest/inbound-share/untrack-share-table";
import { deleteIngestToken } from "../src/rest/ingest-token/delete-ingest-token";
import { deleteSkill as restDeleteSkill } from "../src/rest/skill/delete-skill";
import { deleteSourceDataset as restDeleteSourceDataset } from "../src/rest/source-dataset/delete-source-dataset";
import type { Config } from "../src/lib/config";

export async function cleanupIngestToken(
  config: Config,
  id: string,
): Promise<void> {
  await deleteIngestToken({ config, id });
}

export async function deleteDatastream(
  config: Config,
  id: string,
): Promise<void> {
  const success = await gqlDeleteDatastream(config, { id });
  if (!success) {
    throw new Error(`deleteDatastream returned false for datastream ${id}`);
  }
}

export async function deleteDataset(config: Config, id: string): Promise<void> {
  const success = await gqlDeleteDataset(config, { dsid: id });
  if (!success) {
    throw new Error(`deleteDataset returned false for dataset ${id}`);
  }
}

export async function deleteSourceDataset(
  config: Config,
  id: string,
): Promise<void> {
  await restDeleteSourceDataset({ config, id, force: true });
}

/** Untracks a share table, which also deletes the dataset it was tracked as. */
export async function untrackTrackedShareTable(
  config: Config,
  shareId: string,
  tableId: string,
): Promise<void> {
  await untrackShareTable({ config, shareId, tableId });
}

export async function deleteSkill(config: Config, id: string): Promise<void> {
  await restDeleteSkill({ config, id });
}
