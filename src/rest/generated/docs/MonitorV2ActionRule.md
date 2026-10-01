
# MonitorV2ActionRule

Either the actionId or the definition must be present when setting. The actionId references an existing shared action, while the definition would be used to configure an inline (private to a monitor) action. A read returns both: the actionId of the bound action and, for an inline action, the definition that can be edited and sent back. 

## Properties

Name | Type
------------ | -------------
`actionId` | string
`levels` | [MonitorV2AlarmLevel](MonitorV2AlarmLevel.md)
`conditions` | [MonitorV2ComparisonExpression](MonitorV2ComparisonExpression.md)
`sendEndNotifications` | boolean
`sendRemindersInterval` | boolean
`definition` | [MonitorV2ActionDefinition](MonitorV2ActionDefinition.md)


[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


