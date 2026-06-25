import type { Config } from "../../lib/config";
import { MonitorApi, type MonitorV2PatchRequest } from "../generated";
import { createApiConfiguration } from "../api-config";

export async function updateMonitor({
  config,
  id,
  ...patch
}: { config: Config; id: number } & MonitorV2PatchRequest): Promise<void> {
  const api = new MonitorApi(createApiConfiguration(config));
  await api.updateMonitor({ id, monitorV2PatchRequest: patch });
}
