
# ApmMetricsRecord

Closed RED carrier: invocationRatePerSecond, errorRatePerSecond, durationP95Seconds. `series[]` is opt-in via expand=true on /v1/apm/services only. 

## Properties

Name | Type
------------ | -------------
`interval` | [ApmInterval](ApmInterval.md)
`invocationRatePerSecond` | number
`errorRatePerSecond` | number
`durationP95Seconds` | number
`series` | [Array&lt;ApmMetricsRecordPoint&gt;](ApmMetricsRecordPoint.md)


[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


