/**
 * API teardown helpers for integration tests — not part of the CLI surface under test.
 *
 * Register these with `fixture.registerCleanup()`; assertions belong on CLI output only.
 */

import { deleteDatastream as gqlDeleteDatastream } from "../src/gql/datastream/delete-datastream";
import { deleteDataset as gqlDeleteDataset } from "../src/gql/dataset/delete-dataset";
import { deleteIngestToken as gqlDeleteIngestToken } from "../src/gql/ingest-token/delete-ingest-token";
import { deleteSkill as restDeleteSkill } from "../src/rest/skill/delete-skill";
import type { Config } from "../src/lib/config";

export async function deleteIngestToken(
  config: Config,
  id: string,
): Promise<void> {
  const success = await gqlDeleteIngestToken(config, { id });
  if (!success) {
    throw new Error(`deleteIngestToken returned false for ingest token ${id}`);
  }
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

export async function deleteSkill(config: Config, id: string): Promise<void> {
  await restDeleteSkill({ config, id });
}
