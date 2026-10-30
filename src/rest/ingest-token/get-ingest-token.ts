import type { Config } from "../../lib/config";
import { ObserveRestSDK } from "../client";

export async function getIngestToken({
  config,
  id,
}: {
  config: Config;
  id: string;
}) {
  const sdk = new ObserveRestSDK(config);
  return sdk.ingestTokensApi.getIngestToken({ id, expand: true });
}
