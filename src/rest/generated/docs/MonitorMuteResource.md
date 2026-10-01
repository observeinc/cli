
# MonitorMuteResource

A mute rule suppresses alert notifications during a defined time window. Use `target.kind: Global` to mute all monitors, or `target.kind: Monitors` to target a specific set. 

## Properties

Name | Type
------------ | -------------
`id` | string
`label` | string
`description` | string
`target` | [MonitorMuteTarget](MonitorMuteTarget.md)
`schedule` | [MonitorMuteSchedule](MonitorMuteSchedule.md)
`filter` | string
`startTime` | string
`endTime` | string
`createdBy` | [User](User.md)
`createdAt` | string
`updatedBy` | [User](User.md)
`updatedAt` | string


[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


