
# MonitorRollupStatus

Single health summary, derived from the monitor\'s other fields and resolved by priority, highest first: `Disabled` (by a user or a limit), `Failed` (an error logged since the last run and less than a week old), `Warnings` (likewise a warning), `Initializing` (an anomaly monitor that has not yet produced its output dataset, so it cannot evaluate yet), `Running` (the default). A monitor can satisfy more than one — only the highest is reported, and the ranking may change. See the note under the list operation\'s `filter` for the part of `Initializing` this endpoint cannot see. 

## Properties

Name | Type
------------ | -------------


[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


