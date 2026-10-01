
# ApmMetricRef

One queryable metric on Service.related.metrics. Names are the RED metrics used for this row (call count, error count, duration). Every entry shares the same `attributeMapping` as `related.correlationTags`. Pick the `serviceName` dimension from `Service.type`: `Service` → `service.name`, `Database` → `peer.db.name`, `Messaging` → `peer.messaging.system`, `ExternalCall` → `peer.server.address`. Precedence is `Service` > `Database` > `Messaging` > `ExternalCall`. When `type` is null, use `service.name`. 

## Properties

Name | Type
------------ | -------------
`metricName` | string
`dataset` | [DatasetRef](DatasetRef.md)
`attributeMapping` | { [key: string]: Array&lt;string&gt; | undefined; }


[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


