import type { Config } from "../../lib/config";
import type { SkillCreateRequest } from "../generated";
import { ObserveRestSDK } from "../client";

export async function createSkill({
  config,
  skillCreateRequest,
}: {
  config: Config;
  skillCreateRequest: SkillCreateRequest;
}) {
  const sdk = new ObserveRestSDK(config);
  return sdk.skillsApi.createSkill({ skillCreateRequest });
}
