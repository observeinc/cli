import {
  SkillsApi,
  AlertApi,
  Configuration,
  DatasetApi,
  ExportApi,
  MonitorMuteApi,
  V2KnowledgeGraphApi,
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
  public monitorMuteApi: MonitorMuteApi;
  public knowledgeGraphApi: V2KnowledgeGraphApi;
  public skillsApi: SkillsApi;

  constructor(_config: Config) {
    const config = createConfiguration(_config);

    this.exportApi = new ExportApi(config);
    this.datasetApi = new DatasetApi(config);
    this.alertApi = new AlertApi(config);
    this.monitorMuteApi = new MonitorMuteApi(config);
    this.knowledgeGraphApi = new V2KnowledgeGraphApi(config);
    this.skillsApi = new SkillsApi(config);
  }
}
