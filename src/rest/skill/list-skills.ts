import type { Config } from "../../lib/config";
import type { SkillsApiListSkillsRequest } from "../generated";
import { ObserveRestSDK } from "../client";

export async function listSkills({
  config,
  ...params
}: { config: Config } & Omit<SkillsApiListSkillsRequest, "expand">) {
  const sdk = new ObserveRestSDK(config);
  const response = await sdk.skillsApi.listSkills({
    ...params,
    expand: false,
  });
  return response;
}
