
# DatasetGraphResponse

Response body for both GET /v1/datasets/graph and GET /v1/datasets/{id}/graph. On the full-graph endpoint: datasets are sorted by id ascending, and meta.totalCount is always the number of returned datasets (never -1). On the focal endpoint: datasets are sorted in BFS-nearest order (focal first, then by BFS depth, ties broken by id ascending for determinism), and meta.totalCount is -1 iff the BFS was capped by limit; otherwise it is the number of returned datasets. 

## Properties

Name | Type
------------ | -------------
`datasets` | [Array&lt;DatasetGraphSummary&gt;](DatasetGraphSummary.md)
`meta` | [Meta](Meta.md)


[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


