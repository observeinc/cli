import type { Config } from "../../lib/config";
import { ObserveRestSDK } from "../client";

export async function deleteIngestToken({
  config,
  id,
}: {
  config: Config;
  id: string;
}) {
  const sdk = new ObserveRestSDK(config);
  await sdk.ingestTokensApi.deleteIngestToken({ id });
}
