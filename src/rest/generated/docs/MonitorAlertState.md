
# MonitorAlertState

Whether the monitor is alerting now, has alerted before, or never has. `Triggering` means an alarm is open, or one was raised since the last evaluation; a monitor that is turned off is never `Triggering` because it cannot evaluate. `Previous` means it has alerted at some point but is not now — the same set as `lastAlarmTime != null` minus the triggering ones. 

## Properties

Name | Type
------------ | -------------


[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


