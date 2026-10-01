
# MonitorMuteTargetInput

Input shape for a mute target. `kind` is optional in PATCH — if provided it must match the existing value since `kind` is immutable after creation. `monitors` is required and non-empty when `kind` is `Monitors`; omit or leave empty when `kind` is `Global`. 

## Properties

Name | Type
------------ | -------------
`kind` | [MonitorMuteTargetKind](MonitorMuteTargetKind.md)
`monitors` | [Array&lt;MonitorRef&gt;](MonitorRef.md)


[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


