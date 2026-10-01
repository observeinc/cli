
# AlertResource

A monitor alert representing a detected condition.

## Properties

Name | Type
------------ | -------------
`id` | string
`start` | string
`end` | string
`detectedStart` | string
`detectedEnd` | string
`status` | [AlertStatus](AlertStatus.md)
`level` | [AlertLevel](AlertLevel.md)
`groupingHash` | string
`capturedValues` | [Array&lt;AlertCapturedValue&gt;](AlertCapturedValue.md)
`context` | [Array&lt;AlertContextEntry&gt;](AlertContextEntry.md)
`monitorVersion` | string
`monitor` | [MonitorRef](MonitorRef.md)
`muted` | boolean
`aiChats` | [Array&lt;ChatResource&gt;](ChatResource.md)
`automaticInvestigation` | [AlertAutomaticInvestigation](AlertAutomaticInvestigation.md)
`resolvedServiceBinding` | [AlertResolvedServiceBinding](AlertResolvedServiceBinding.md)
`stats` | [AlertActionStats](AlertActionStats.md)


[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


