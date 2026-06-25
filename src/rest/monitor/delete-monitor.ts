import type { Config } from "../../lib/config";
import { MonitorApi } from "../generated";
import { createApiConfiguration } from "../api-config";

export async function deleteMonitor({
  config,
  id,
}: {
  config: Config;
  id: number;
}): Promise<void> {
  const api = new MonitorApi(createApiConfiguration(config));
  await api.deleteMonitor({ id });
}
