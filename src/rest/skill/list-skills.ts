import type { Config } from "../../lib/config";
import type { SkillsApiListSkillsRequest } from "../generated";
import { ObserveRestSDK } from "../client";

export async function listSkills({
  config,
  expand = false,
  ...params
}: { config: Config; expand?: boolean } & Omit<
  SkillsApiListSkillsRequest,
  "expand"
>) {
  const sdk = new ObserveRestSDK(config);
  const response = await sdk.skillsApi.listSkills({
    ...params,
    expand,
  });
  return response;
}
