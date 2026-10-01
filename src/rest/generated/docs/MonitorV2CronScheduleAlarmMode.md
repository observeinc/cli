
# MonitorV2CronScheduleAlarmMode

Controls how alarms are emitted across consecutive monitor evaluations. PerRun (the default when omitted) emits an independent zero-duration alarm per firing evaluation. Ongoing causes consecutive evaluations that re-assert the same (group, level) to extend a single ongoing alarm. Setting the value to Ongoing is gated by a customer feature flag. 

## Properties

Name | Type
------------ | -------------


[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


