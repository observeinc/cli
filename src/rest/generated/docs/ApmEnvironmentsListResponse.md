
# ApmEnvironmentsListResponse

Response envelope for GET /v1/apm/environments. `interval` echoes the server-resolved query window. Pagination is on the environments axis — `serviceNamespaces` is the complete list per environment, never paged. 

## Properties

Name | Type
------------ | -------------
`interval` | [ApmInterval](ApmInterval.md)
`environments` | [Array&lt;ApmEnvironmentEntry&gt;](ApmEnvironmentEntry.md)
`meta` | [ApmMeta](ApmMeta.md)


[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


