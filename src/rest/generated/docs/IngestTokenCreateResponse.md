
# IngestTokenCreateResponse

The newly created ingest token. Same shape as IngestToken-Resource, but the one-time `secret` is always present here — it is returned only in this response and can never be read back.

## Properties

Name | Type
------------ | -------------
`id` | string
`name` | string
`description` | string
`disabled` | boolean
`createdBy` | [User](User.md)
`createdAt` | string
`updatedBy` | [User](User.md)
`updatedAt` | string
`stats` | [IngestTokenStats](IngestTokenStats.md)
`secret` | string


[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


