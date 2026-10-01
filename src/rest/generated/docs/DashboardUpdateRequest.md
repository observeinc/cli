
# DashboardUpdateRequest

Merge-patch (RFC 7396) body for a dashboard. Only fields present are applied. When `definition` is present it replaces the whole document. 

## Properties

Name | Type
------------ | -------------
`schemaVersion` | [DashboardUpdateRequestSchemaVersion](DashboardUpdateRequestSchemaVersion.md)
`name` | string
`description` | string
`visibility` | [DashboardListItemVisibility](DashboardListItemVisibility.md)
`objectTags` | { [key: string]: Array&lt;string&gt; | undefined; }
`definition` | [DashboardContent](DashboardContent.md)


[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


