
# MonitorV2CorrelationTag

Marker on a `MonitorV2Column` indicating that the column is grouping by a correlation tag (e.g. `service.name`) rather than a specific physical column. The per-column struct carries the tag name and optional resolution `meta`; the authoritative `(tag, backing-column)` mapping for every correlation tag in the schema lives on `MonitorV2AlertSchema.correlationTags`. 

## Properties

Name | Type
------------ | -------------
`tag` | string
`meta` | [MonitorV2CorrelationTagMeta](MonitorV2CorrelationTagMeta.md)


[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


