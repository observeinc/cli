
# IngestRoutesUpdateRequest

Merge-patch payload (RFC 7396). Only fields explicitly present are updated; omitted fields keep their current value. Priority is not settable here — use `PATCH /v1/ingest/routes/{type}` to reorder.  `secondaryDestinationId` accepts an explicit `null` to clear it.

## Properties

Name | Type
------------ | -------------
`pipeline` | string
`layout` | object
`destinationId` | string
`secondaryDestinationId` | string
`enabled` | boolean


[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


