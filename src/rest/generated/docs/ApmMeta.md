
# ApmMeta

APM list-response meta. Extends platform Meta (totalCount only) with limit and offset echoed from the request. A totalCount of -1 means the exact count is unknown (too expensive to compute); in that case paginate by advancing offset until a short page (len(items) < limit) is returned. 

## Properties

Name | Type
------------ | -------------
`totalCount` | number
`limit` | number
`offset` | number


[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


