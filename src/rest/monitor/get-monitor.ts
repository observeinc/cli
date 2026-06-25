import type { Config } from "../../lib/config";
import { MonitorApi, type MonitorV2 } from "../generated";
import { ResponseError } from "../generated/runtime";
import { createApiConfiguration } from "../api-config";

export async function getMonitor({
  config,
  id,
}: {
  config: Config;
  id: number;
}): Promise<MonitorV2 | null> {
  const api = new MonitorApi(createApiConfiguration(config));
  try {
    return await api.getMonitor({ id });
  } catch (error) {
    if (error instanceof ResponseError && error.response.status === 404) {
      return null;
    }
    throw error;
  }
}
