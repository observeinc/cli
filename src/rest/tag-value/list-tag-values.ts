import type { Config } from "../../lib/config";
import type { TagValuesResponse } from "../types/tag-values";

export async function listTagValues(_params: {
  config: Config;
  match?: string;
  mode?: "semantic" | "regex";
  limit: number;
}): Promise<TagValuesResponse> {
  throw new Error("Knowledge Graph API is not available on this Observe instance.");
}
