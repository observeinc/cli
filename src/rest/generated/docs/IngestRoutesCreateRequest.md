
# IngestRoutesCreateRequest

A new route is created **disabled**, and is ignored by the ingest pipeline until you enable it with a PATCH. The one exception is the default route, which is always enabled.  A new route is assigned the lowest priority among non-default routes, so it is evaluated last. Use `PATCH /v1/ingest/routes/{type}` to reorder.  Creating the first route for a type also creates that type\'s default route automatically, so that no observation is left unrouted.

## Properties

Name | Type
------------ | -------------
`pipeline` | string
`layout` | object
`destinationId` | string
`secondaryDestinationId` | string


[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


