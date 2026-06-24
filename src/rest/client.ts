import {
  AlertApi,
  Configuration,
  DatasetApi,
  ExportApi,
  MonitorApi,
} from "./generated";
import { getApiBaseUrl, type Config } from "../lib/config";
import { observeApiHeaders } from "../lib/user-agent";

function createConfiguration(config: Config) {
  return new Configuration({
    basePath: getApiBaseUrl(config),
    accessToken: async () => `${config.customerId} ${config.token}`,
    headers: observeApiHeaders(),
  });
}

export class ObserveRestSDK {
  public exportApi: ExportApi;
  public datasetApi: DatasetApi;
  public alertApi: AlertApi;
  public monitorApi: MonitorApi;

  constructor(_config: Config) {
    const config = createConfiguration(_config);

    this.exportApi = new ExportApi(config);
    this.datasetApi = new DatasetApi(config);
    this.alertApi = new AlertApi(config);
    this.monitorApi = new MonitorApi(config);
  }
}
