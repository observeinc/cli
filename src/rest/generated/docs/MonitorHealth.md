
# MonitorHealth

The monitor\'s operating state as one value, which is what the monitors list shows in its Health column and facets on.  `rollupStatus` answers a narrower question — how the last evaluation went — so it reports `Running` for a monitor that is turned off, over its spend limit, or on a passive cluster. `health` ranks those causes above the run outcome, highest first:  | Value | Meaning | |---|---| | `CostDisabled` | Turned off after exceeding its spend limit. | | `AlertRateLimitDisabled` | Turned off after exceeding its alert rate. | | `Disabled` | Turned off by a user. | | `ClusterPassive` | Its customer\'s monitoring is not active on this cluster, so nothing evaluates. Set for every monitor of that customer at once. | | `AtRisk` | Inside the grace period before its spend limit disables it. | | `Failed` | An error was logged since the last run, less than a week ago. | | `Warnings` | Likewise a warning. | | `Initializing` | An anomaly monitor that has not yet produced its output dataset, so it cannot evaluate. | | `Running` | None of the above. |  A monitor can satisfy several; only the highest is reported, and the ranking may change. `Initializing` is only partially reachable — see the note under the list operation\'s `filter` for the warm-up tail this endpoint cannot see. 

## Properties

Name | Type
------------ | -------------


[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


