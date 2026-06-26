import type { Config } from "../../lib/config";
import { ObserveRestSDK } from "../client";

export async function deleteSkill({
  config,
  id,
}: {
  config: Config;
  id: string;
}): Promise<void> {
  const sdk = new ObserveRestSDK(config);
  await sdk.skillsApi.deleteSkill({ id });
}
