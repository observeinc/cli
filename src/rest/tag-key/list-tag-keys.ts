import type { Config } from "../../lib/config";
import type { TagKeysResponse } from "../types/tag-keys";

export async function listTagKeys(_params: {
  config: Config;
  match?: string;
  mode?: "semantic" | "regex";
  limit: number;
  valueLimit?: number;
}): Promise<TagKeysResponse> {
  throw new Error("Knowledge Graph API is not available on this Observe instance.");
}
