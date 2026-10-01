
# MonitorV2Health

The monitor\'s operating state as one value, computed from its last evaluation and from its cluster\'s failover role. Resolved by priority, highest first:  | Value | Meaning | |---|---| | `Disabled` | Turned off, whether by a user or by a spend or alert-rate limit. | | `ClusterPassive` | Its customer\'s monitoring is not active on this cluster, so nothing evaluates. Set for every monitor of that customer at once. | | `Failed` | The monitor logged an error since its last run, less than a week ago. | | `Warnings` | The monitor logged a warning in that same window. | | `Initializing` | An anomaly monitor has not yet produced its output dataset, so it cannot evaluate. | | `Running` | Nothing above applies. |  A monitor can satisfy several; the API reports only the highest, and the ranking may change.  A monitor that a limit turned off reports plain `Disabled` here. The monitors list API separates those causes into `CostDisabled`, `AlertRateLimitDisabled` and `AtRisk` in its own `MonitorHealth` enum; this one omits them. 

## Properties

Name | Type
------------ | -------------


[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


