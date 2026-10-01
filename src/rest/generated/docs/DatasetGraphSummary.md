
# DatasetGraphSummary

Lean per-dataset projection used to render the Dataset Graph, Lineage tab, and Explore Universe views. Intentionally a strict subset of Dataset-Resource: only the fields required to render a graph node and its outgoing edges. expand is not supported on graph endpoints.  NOTE: foreignKeyTargetIds and inputDatasetIds are returned as flat arrays of id strings rather than the nested reference shape used elsewhere in this API. This is a deliberate divergence from the REST Style Guide accepted for payload size on the full-graph endpoint; these fields are not expandable. 

## Properties

Name | Type
------------ | -------------
`id` | string
`label` | string
`kind` | [DatasetDatasetKind](DatasetDatasetKind.md)
`contentType` | [DatasetContentType](DatasetContentType.md)
`icon` | string
`compilationError` | [DatasetCompilationError](DatasetCompilationError.md)
`accelerationState` | [DatasetAccelerationState](DatasetAccelerationState.md)
`foreignKeyTargetIds` | Array&lt;string&gt;
`inputDatasetIds` | Array&lt;string&gt;


[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


