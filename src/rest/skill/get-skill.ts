import type { Config } from "../../lib/config";
import type { SkillResource } from "../generated";
import { ResponseError } from "../generated";
import { ObserveRestSDK } from "../client";

export async function getSkill({
  config,
  skillId,
}: {
  config: Config;
  skillId: string;
}): Promise<SkillResource | null> {
  const sdk = new ObserveRestSDK(config);
  try {
    return await sdk.skillsApi.getSkill({
      id: skillId,
      expand: true,
    });
  } catch (error) {
    if (error instanceof ResponseError && error.response.status === 404) {
      return null;
    }
    throw error;
  }
}
