/**
 * API setup helpers for integration tests — not part of the CLI surface under test.
 *
 * Helpers register matching teardown from `cleanup.ts` via the fixture; tests
 * should only call `fixture.registerCleanup()` for resources they create via CLI.
 */

import { saveDataset as gqlSaveDataset } from "../src/gql/dataset/save-dataset";
import { listDatasets } from "../src/rest/dataset/list-datasets";
import { createSkill as restCreateSkill } from "../src/rest/skill/create-skill";
import { getDefaultWorkspace } from "../src/gql/workspace/get-default-workspace";
import { SkillVisibility } from "../src/rest/generated";
import { deleteDataset, deleteSkill } from "./cleanup";
import type { IntegrationFixture } from "./fixture";

export const TEST_DATASET_DESCRIPTION = "integration test fixture";
export const TEST_SKILL_DESCRIPTION = "integration test fixture";

/** Create a derived Event dataset on top of the System dataset via saveDataset. */
export async function createTestDataset(
  fixture: IntegrationFixture,
  label: string,
  opal: string,
): Promise<Awaited<ReturnType<typeof gqlSaveDataset>>> {
  const config = fixture.tenant;
  const { workspace } = await getDefaultWorkspace(config);
  if (!workspace) {
    throw new Error("no default workspace found for integration tenant");
  }

  const systemDataset = (
    await listDatasets({
      config,
      filter: 'label == "System"',
      limit: 1,
    })
  ).datasets[0];
  if (!systemDataset?.id) {
    throw new Error("expected System dataset to exist on integration tenant");
  }

  const dataset = await gqlSaveDataset(config, {
    workspaceId: workspace.id,
    dataset: {
      label,
      description: TEST_DATASET_DESCRIPTION,
    },
    query: {
      outputStage: "main",
      stages: [
        {
          id: "main",
          input: [
            {
              inputName: "in",
              inputRole: "Data",
              datasetId: systemDataset.id,
            },
          ],
          pipeline: opal,
        },
      ],
    },
  });

  fixture.registerCleanup(() => deleteDataset(config, dataset.id));

  return dataset;
}

/** Create a skill via REST (CLI has list/view only). */
export async function createTestSkill(
  fixture: IntegrationFixture,
  label: string,
  content: string,
): Promise<Awaited<ReturnType<typeof restCreateSkill>>> {
  const config = fixture.tenant;

  const skill = await restCreateSkill({
    config,
    skillCreateRequest: {
      label,
      description: TEST_SKILL_DESCRIPTION,
      content,
      visibility: SkillVisibility.Unlisted,
    },
  });

  fixture.registerCleanup(() => deleteSkill(config, skill.id));

  return skill;
}
