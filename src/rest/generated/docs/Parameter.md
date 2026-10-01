
# Parameter

A viewer-controllable value that cards reference from OPAL as `$parameterId`. `valueKind` fixes what sort of value it holds and `viewType` chooses the input control. Dashboards can place a parameter on the grid as a card; worksheets cannot. 

## Properties

Name | Type
------------ | -------------
`id` | string
`label` | string
`viewType` | [ParameterViewType](ParameterViewType.md)
`valueKind` | [ValueKind](ValueKind.md)
`allowEmpty` | boolean
`hidden` | boolean
`defaultValue` | [ParameterDefaultValue](ParameterDefaultValue.md)
`customEmptyValueLabel` | string


[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


