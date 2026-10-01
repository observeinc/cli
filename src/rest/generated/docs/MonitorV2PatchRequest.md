
# MonitorV2PatchRequest

Request body for `PATCH .../monitors/{id}`. Every property is optional. Only these top-level keys participate in the update; see the operation description for merge vs whole-value replacement rules. 

## Properties

Name | Type
------------ | -------------
`name` | string
`disabled` | boolean
`description` | string
`ruleKind` | [MonitorV2RuleKind](MonitorV2RuleKind.md)
`definition` | [MonitorV2Definition](MonitorV2Definition.md)
`actionRules` | [Array&lt;MonitorV2ActionRule&gt;](MonitorV2ActionRule.md)


[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


