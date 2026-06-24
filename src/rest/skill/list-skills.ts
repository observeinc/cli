import type { Config } from "../../lib/config";

export async function listSkills(params: { config: Config; [key: string]: unknown }): Promise<never> {
  void params;
  throw new Error("Skills API is not available on this Observe instance.");
}
