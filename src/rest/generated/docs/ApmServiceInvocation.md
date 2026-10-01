
# ApmServiceInvocation

Directed call edge from source to target. Both are always non-null — roots are services with no inbound edge in invocations[], not edges with null source. Carrier field is `metrics` (not `redMetrics`). 

## Properties

Name | Type
------------ | -------------
`source` | [ApmInvocationParticipant](ApmInvocationParticipant.md)
`target` | [ApmInvocationParticipant](ApmInvocationParticipant.md)
`metrics` | [ApmMetricsRecord](ApmMetricsRecord.md)


[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


