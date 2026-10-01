
# ApmServicesListResponse

Response envelope for GET /v1/apm/services. `interval` echoes the server-resolved query window. `meta.totalCount` is `-1` when unknown. 

## Properties

Name | Type
------------ | -------------
`interval` | [ApmInterval](ApmInterval.md)
`services` | [Array&lt;ApmService&gt;](ApmService.md)
`meta` | [ApmMeta](ApmMeta.md)


[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


