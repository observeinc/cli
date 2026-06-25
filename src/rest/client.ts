import {
  SkillsApi,
  AlertApi,
  DatasetApi,
  ExportApi,
  MonitorApi,
  V2KnowledgeGraphApi,
} from "./generated";
import type { Config } from "../lib/config";
import { createApiConfiguration } from "./api-config";

export class ObserveRestSDK {
  public exportApi: ExportApi;
  public datasetApi: DatasetApi;
  public alertApi: AlertApi;
  public monitorApi: MonitorApi;
  public knowledgeGraphApi: V2KnowledgeGraphApi;
  public skillsApi: SkillsApi;

  constructor(_config: Config) {
    const config = createApiConfiguration(_config);

    this.exportApi = new ExportApi(config);
    this.datasetApi = new DatasetApi(config);
    this.alertApi = new AlertApi(config);
    this.monitorApi = new MonitorApi(config);
    this.knowledgeGraphApi = new V2KnowledgeGraphApi(config);
    this.skillsApi = new SkillsApi(config);
  }
}
