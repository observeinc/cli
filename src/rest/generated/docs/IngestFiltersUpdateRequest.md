
# IngestFiltersUpdateRequest

Merge-patch payload (RFC 7396). Only fields explicitly present are updated; omitted fields keep their current value. `description`, `iconUrl`, and `layout` accept an explicit `null` to clear them. `label`, `pipeline`, `dropRate`, and `enabled` are not nullable — sending `null` for any of those is rejected with a 400.

## Properties

Name | Type
------------ | -------------
`label` | string
`description` | string
`iconUrl` | string
`pipeline` | string
`layout` | object
`dropRate` | number
`enabled` | boolean


[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


