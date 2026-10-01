
# MonitorV2ActionDefinition

The configuration of an action. `type` selects which payload applies: `Email` uses `email`, while `Webhook`, `Slack` and `PagerDuty` all use `webhook`. A PagerDuty action is a webhook posted to the PagerDuty Events API, so its routing key is a field of the JSON template in `webhook.body` rather than a property of its own. 

## Properties

Name | Type
------------ | -------------
`inline` | boolean
`name` | string
`type` | [MonitorV2ActionType](MonitorV2ActionType.md)
`email` | [MonitorV2EmailAction](MonitorV2EmailAction.md)
`webhook` | [MonitorV2WebhookAction](MonitorV2WebhookAction.md)


[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


