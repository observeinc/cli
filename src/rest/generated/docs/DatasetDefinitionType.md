
# DatasetDefinitionType

The kind of dataset definition. Values match `metatypes.TransformKind`\'s string constants verbatim where the backend has one (`OPAL`, `Builtin`, `LogDerived`); `Source` and `Invalid` are REST-side additions for dataset shapes the backend does not surface as a TransformKind. - OPAL: dataset is produced by an OPAL transform pipeline. - Builtin: dataset is produced by a built-in transform (e.g. canonical-trace). - LogDerived: dataset is a log-derived metric. - Source: dataset receives data directly (datastream or external table); it has no transform. - Invalid: the stored transform kind is empty or unrecognised. Indicates corrupt or partially-migrated data, or a legacy SQL-kind transform (no production datasets carry one as of 2026-05-14). 

## Properties

Name | Type
------------ | -------------


[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


