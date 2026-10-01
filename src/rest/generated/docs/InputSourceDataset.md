
# InputSourceDataset

A dataset binding. Normally identified by `id`, but `id` may be absent for a by-name binding — a mode where the input references a dataset only by `name`/`path` (e.g. an input resolved across tenants, where IDs differ but names match) — in which case `name` or `path` carries the reference. 

## Properties

Name | Type
------------ | -------------
`id` | string
`name` | string
`path` | string


[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


