
# ApmService

Service identity (OTel compound key) + RED snapshot under redMetrics + per-row related hints. ServiceInvocation uses `metrics` (not `redMetrics`) for the same MetricsRecord type — intentional asymmetry. 

## Properties

Name | Type
------------ | -------------
`serviceName` | string
`environment` | string
`serviceNamespace` | string
`type` | [ApmServiceType](ApmServiceType.md)
`language` | string
`redMetrics` | [ApmMetricsRecord](ApmMetricsRecord.md)
`related` | [ApmServiceRelated](ApmServiceRelated.md)


[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


