
# ApmServiceRelated

Per-row correlation hints on Service. Always present; `metrics` may be `[]`. `correlationTags` maps Service fields to the attribute keys to filter with:  - `serviceName`: `service.name`, `peer.db.name`, `peer.messaging.system`,   `peer.server.address` - `environment`: `deployment.environment.name` - `serviceNamespace`: `service.namespace`  These are attribute keys, not dataset column names. Use `Service.type` to pick the `serviceName` key to filter on: `Service` → `service.name`, `Database` → `peer.db.name`, `Messaging` → `peer.messaging.system`, `ExternalCall` → `peer.server.address`. Precedence is `Service` > `Database` > `Messaging` > `ExternalCall`. When `type` is null, use `service.name`. `environment` and `serviceNamespace` apply to every type. 

## Properties

Name | Type
------------ | -------------
`correlationTags` | { [key: string]: Array&lt;string&gt; | undefined; }
`metrics` | [Array&lt;ApmMetricRef&gt;](ApmMetricRef.md)


[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


