
# DashboardResource

Full dashboard resource returned by Get, Create, and Update. Includes all envelope fields from the list item plus `definition`.  When `expand=true`, `createdBy` and `updatedBy` include display fields (e.g. `label`); `managedBy.record` is populated. Without `expand`, references contain only `id`. 

## Properties

Name | Type
------------ | -------------
`id` | string
`schemaVersion` | [DashboardListItemSchemaVersion](DashboardListItemSchemaVersion.md)
`name` | string
`description` | string
`createdAt` | string
`updatedAt` | string
`createdBy` | [User](User.md)
`updatedBy` | [User](User.md)
`managedBy` | [ObjectRef](ObjectRef.md)
`visibility` | [DashboardListItemVisibility](DashboardListItemVisibility.md)
`objectTags` | { [key: string]: Array&lt;string&gt; | undefined; }
`definition` | [DashboardContent](DashboardContent.md)


[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


