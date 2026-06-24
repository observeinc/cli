import type { Config } from "../../lib/config";

export async function getSkill(params: { config: Config; skillId: string }): Promise<never> {
  void params;
  throw new Error("Skills API is not available on this Observe instance.");
}
