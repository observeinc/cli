import type { Config } from "../../lib/config";
import {
  MonitorApi,
  type MonitorApiCreateMonitorRequest,
  type MonitorV2,
} from "../generated";
import { createApiConfiguration } from "../api-config";

export async function createMonitor({
  config,
  ...params
}: { config: Config } & MonitorApiCreateMonitorRequest): Promise<MonitorV2> {
  const api = new MonitorApi(createApiConfiguration(config));
  return await api.createMonitor(params);
}
