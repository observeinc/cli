
# MonitorMuteUpdateRequest

All fields are optional. Omitted fields are left unchanged. Sending a `target` object replaces the entire target subtree atomically; `target.kind` must match the existing value (it is immutable). Send `filter: null` to remove an existing filter. 

## Properties

Name | Type
------------ | -------------
`label` | string
`description` | string
`target` | [MonitorMuteTargetInput](MonitorMuteTargetInput.md)
`schedule` | [MonitorMuteScheduleInput](MonitorMuteScheduleInput.md)
`filter` | string


[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


