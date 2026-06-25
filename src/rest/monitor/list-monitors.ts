import type { Config } from "../../lib/config";
import { MonitorApi, type MonitorApiListMonitorsRequest } from "../generated";
import { createApiConfiguration } from "../api-config";

export async function listMonitors({
  config,
  ...params
}: { config: Config } & MonitorApiListMonitorsRequest) {
  const api = new MonitorApi(createApiConfiguration(config));
  return await api.listMonitors(params);
}
