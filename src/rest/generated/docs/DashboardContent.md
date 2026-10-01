
# DashboardContent

The dashboard body — what the dashboard shows — kept separate from the identity, audit, and governance metadata on the dashboard itself so the two can evolve independently. This is the object governed by `schemaVersion`. 

## Properties

Name | Type
------------ | -------------
`defaultTimeRange` | [FrontendTimeRange](FrontendTimeRange.md)
`datasetFilter` | [DatasetFilter](DatasetFilter.md)
`hiddenParameters` | [Array&lt;Parameter&gt;](Parameter.md)
`hiddenQueries` | [Array&lt;Query&gt;](Query.md)
`ui` | { [key: string]: any | undefined; }
`layout` | [Layout](Layout.md)


[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


