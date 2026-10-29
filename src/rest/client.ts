import {
  SkillsApi,
  SourceDatasetApi,
  StorageIntegrationsApi,
  AlertApi,
  APMApi,
  DashboardsApi,
  DatasetApi,
  DocumentationApi,
  ExportApi,
  ExternalSharesApi,
  MetricsApi,
  MonitorMuteApi,
  MonitorApi,
  TagsApi,
  TagValuesApi,
} from "./generated";
import type { Config } from "../lib/config";
import { createApiConfiguration } from "./api-config";

export class ObserveRestSDK {
  public exportApi: ExportApi;
  public datasetApi: DatasetApi;
  public metricsApi: MetricsApi;
  public alertApi: AlertApi;
  public apmApi: APMApi;
  public dashboardsApi: DashboardsApi;
  public monitorMuteApi: MonitorMuteApi;
  public monitorApi: MonitorApi;
  public tagsApi: TagsApi;
  public tagValuesApi: TagValuesApi;
  public skillsApi: SkillsApi;
  public documentationApi: DocumentationApi;
  public sourceDatasetApi: SourceDatasetApi;
  public storageIntegrationsApi: StorageIntegrationsApi;
  public externalSharesApi: ExternalSharesApi;

  constructor(_config: Config) {
    const config = createApiConfiguration(_config);

    this.exportApi = new ExportApi(config);
    this.datasetApi = new DatasetApi(config);
    this.metricsApi = new MetricsApi(config);
    this.alertApi = new AlertApi(config);
    this.apmApi = new APMApi(config);
    this.dashboardsApi = new DashboardsApi(config);
    this.monitorMuteApi = new MonitorMuteApi(config);
    this.monitorApi = new MonitorApi(config);
    this.tagsApi = new TagsApi(config);
    this.tagValuesApi = new TagValuesApi(config);
    this.skillsApi = new SkillsApi(config);
    this.documentationApi = new DocumentationApi(config);
    this.sourceDatasetApi = new SourceDatasetApi(config);
    this.storageIntegrationsApi = new StorageIntegrationsApi(config);
    this.externalSharesApi = new ExternalSharesApi(config);
  }
}
