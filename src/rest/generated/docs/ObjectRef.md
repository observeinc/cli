
# ObjectRef

A reference to another resource. Always carries the id; the optional `record` field carries the brief metadata, populated when expand=true. Brief expansion applies to one layer only — fields inside `record` that are themselves ObjectRefs (e.g. `record.managedBy`) are returned id-only, never with their own `record` populated. CEL filter expressions can deeper-resolve via lazy wrapper resolution if needed. 

## Properties

Name | Type
------------ | -------------
`id` | string
`record` | [ObjectBrief](ObjectBrief.md)


[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


