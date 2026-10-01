# DatasetApi

All URIs are relative to *https://OBSERVE_CUSTOMERID.observeinc.com*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**getDataset**](DatasetApi.md#getdataset) | **GET** /v1/datasets/{id} | Get a dataset |
| [**getDatasetGraph**](DatasetApi.md#getdatasetgraph) | **GET** /v1/datasets/{id}/graph | Get the lineage graph neighborhood around a focal dataset |
| [**getDatasetStats**](DatasetApi.md#getdatasetstats) | **GET** /v1/datasets/stats | Get dataset attribute statistics |
| [**listDatasetGraph**](DatasetApi.md#listdatasetgraph) | **GET** /v1/datasets/graph | Get the full dataset graph |
| [**listDatasets**](DatasetApi.md#listdatasets) | **GET** /v1/datasets | Get a list of datasets |



## getDataset

> DatasetResource getDataset(id, expand)

Get a dataset

Returns a single dataset by ID. The response body is the same &#x60;Dataset-Resource&#x60; shape returned by the list endpoint.  Set &#x60;expand&#x3D;true&#x60; to inline reference fields (&#x60;createdBy&#x60;, &#x60;updatedBy&#x60;, &#x60;managedBy&#x60;, &#x60;defaultDashboard&#x60;, &#x60;defaultInstanceDashboard&#x60;, &#x60;storageIntegration.record&#x60;). Without &#x60;expand&#x60;, references contain only &#x60;id&#x60;.  To look up a dataset by label or other attribute, use &#x60;GET /v1/datasets&#x60; with a CEL &#x60;filter&#x60;. 

### Example

```ts
import {
  Configuration,
  DatasetApi,
} from '';
import type { GetDatasetRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new DatasetApi(config);

  const body = {
    // string | The id of the dataset to query
    id: 1,
    // boolean | Whether to expand resources referenced in the response to include additional fields (optional)
    expand: true,
  } satisfies GetDatasetRequest;

  try {
    const data = await api.getDataset(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **id** | `string` | The id of the dataset to query | [Defaults to `undefined`] |
| **expand** | `boolean` | Whether to expand resources referenced in the response to include additional fields | [Optional] [Defaults to `undefined`] |

### Return type

[**DatasetResource**](DatasetResource.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Dataset queried successfully |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **404** | Resource not found |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getDatasetGraph

> DatasetGraphResponse getDatasetGraph(id, limit)

Get the lineage graph neighborhood around a focal dataset

Returns the BFS-nearest lineage neighborhood around the focal dataset id, walking transform data-input edges (&#x60;InputRole&#x3D;Data&#x60;) in both directions over the default-filtered dataset set (excludes monitors and metric SMA datasets). The response uses the same &#x60;Dataset-GraphResponse&#x60; shape as &#x60;GET /v1/datasets/graph&#x60;.  Lineage view semantics: foreign-key edges are **not** traversed by this endpoint — they are surfaced by the full-graph endpoint for the Link/Explore-Universe views. Reference-role transform inputs are also excluded.  Ordering within the response is BFS order: focal dataset first, then by BFS depth, ties broken by &#x60;id&#x60; ascending. If the walk exceeds &#x60;limit&#x60;, the response is truncated to the nearest &#x60;limit&#x60; nodes and &#x60;meta.totalCount&#x60; is set to &#x60;-1&#x60;. CEL &#x60;filter&#x60; and &#x60;expand&#x60; are not supported. 

### Example

```ts
import {
  Configuration,
  DatasetApi,
} from '';
import type { GetDatasetGraphRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new DatasetApi(config);

  const body = {
    // string | Focal dataset id.
    id: 41000234,
    // number | Max number of nodes (including the focal) in the returned neighborhood. Default 500, max 5000. When the BFS hits this cap, meta.totalCount is -1.  (optional)
    limit: 789,
  } satisfies GetDatasetGraphRequest;

  try {
    const data = await api.getDatasetGraph(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **id** | `string` | Focal dataset id. | [Defaults to `undefined`] |
| **limit** | `number` | Max number of nodes (including the focal) in the returned neighborhood. Default 500, max 5000. When the BFS hits this cap, meta.totalCount is -1.  | [Optional] [Defaults to `500`] |

### Return type

[**DatasetGraphResponse**](DatasetGraphResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Lineage neighborhood retrieved successfully |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **404** | Resource not found |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getDatasetStats

> DatasetStatsResponse getDatasetStats(topK, filter, attributes, multiValueAttributes)

Get dataset attribute statistics

Returns aggregated statistics — distinct value count and the top-K most frequent value/count pairs — for one or more dataset attributes, optionally restricted to a CEL-filtered subset of datasets.  Each &#x60;attributes&#x60; entry is a CEL expression that produces a comparable value (string, int, bool, timestamp); compound expressions are allowed (&#x60;coalesce(_package, label)&#x60;). The CEL environment matches &#x60;GET /v1/datasets&#x60;; see that endpoint\&#39;s description for the field mapping, type discrepancies, and available functions.  Each &#x60;multiValueAttributes&#x60; entry is a CEL expression that produces a &#x60;list&lt;comparable&gt;&#x60;; the list is flattened across all matching datasets and counted as **total occurrences**, so a single dataset whose expression evaluates to a 3-element list contributes 3 increments. &#x60;multiValueAttributes&#x60; &#x60;count&#x60; values may therefore exceed &#x60;meta.filteredDatasets&#x60;. For &#x60;attributes&#x60; the count is unchanged: the number of *datasets* with that value.  At least one of &#x60;attributes&#x60; or &#x60;multiValueAttributes&#x60; must be non-empty; passing neither returns 400.  Stat values are returned as JSON strings regardless of the expression\&#39;s CEL type:  - &#x60;string&#x60; — verbatim. - &#x60;int&#x60; — decimal digits (e.g. &#x60;\&quot;41000234\&quot;&#x60;). - &#x60;bool&#x60; — &#x60;\&quot;true\&quot;&#x60; or &#x60;\&quot;false\&quot;&#x60;. - &#x60;timestamp&#x60; — RFC 3339 (e.g. &#x60;\&quot;2024-01-01T00:00:00Z\&quot;&#x60;).  The response &#x60;meta&#x60; block reports &#x60;totalDatasets&#x60; (before the filter) and &#x60;filteredDatasets&#x60; (after) so callers can compute coverage. 

### Example

```ts
import {
  Configuration,
  DatasetApi,
} from '';
import type { GetDatasetStatsRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new DatasetApi(config);

  const body = {
    // number | Number of top values to return per attribute, sorted by count descending. Range 1–100. The total distinct count for each attribute is always reported via `distinctCount`, even when it exceeds `topK`. 
    topK: 789,
    // string | CEL expression restricting which datasets contribute to the statistics. Must evaluate to `bool`. Must be URL-encoded. If omitted, statistics are computed across all readable datasets. See `GET /v1/datasets` for the CEL primer and filter examples.  (optional)
    filter: filter_example,
    // string | CSV list of CEL expressions, each producing a comparable value (string, int, bool, timestamp). Each expression identifies one stat to compute over the filtered dataset set. Maximum 10 expressions per request. See the operation description for the wire format of stat values.  Either `attributes` or `multiValueAttributes` must be non-empty; both may be supplied together.  CSV-escape first, then URL-encode. Wrap an item in `\"` if it contains a comma or `\"`; double a literal `\"` to `\"\"` inside a quoted item.  (optional)
    attributes: attributes_example,
    // string | CSV list of CEL expressions, each producing a `list<comparable>` (e.g. `interfaces.map(i, i.path)`, `correlationTags.map(t, t.tag)`, `primaryKey`, `fieldList.map(f, f.name)`). For each matching dataset, the expression\'s list is flattened into a per-expression bag and counts are total occurrences — a single dataset contributes one increment per element. The flattened bag for each expression is capped at 10,000 values across all matching datasets; exceeding the cap returns 400.  Maximum 10 expressions. Either `attributes` or `multiValueAttributes` must be non-empty; both may be supplied together. `topK` applies independently to each entry of either array.  CSV-escape first, then URL-encode. Wrap an item in `\"` if it contains a comma or `\"`; double a literal `\"` to `\"\"` inside a quoted item.  (optional)
    multiValueAttributes: multiValueAttributes_example,
  } satisfies GetDatasetStatsRequest;

  try {
    const data = await api.getDatasetStats(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **topK** | `number` | Number of top values to return per attribute, sorted by count descending. Range 1–100. The total distinct count for each attribute is always reported via &#x60;distinctCount&#x60;, even when it exceeds &#x60;topK&#x60;.  | [Defaults to `undefined`] |
| **filter** | `string` | CEL expression restricting which datasets contribute to the statistics. Must evaluate to &#x60;bool&#x60;. Must be URL-encoded. If omitted, statistics are computed across all readable datasets. See &#x60;GET /v1/datasets&#x60; for the CEL primer and filter examples.  | [Optional] [Defaults to `undefined`] |
| **attributes** | `string` | CSV list of CEL expressions, each producing a comparable value (string, int, bool, timestamp). Each expression identifies one stat to compute over the filtered dataset set. Maximum 10 expressions per request. See the operation description for the wire format of stat values.  Either &#x60;attributes&#x60; or &#x60;multiValueAttributes&#x60; must be non-empty; both may be supplied together.  CSV-escape first, then URL-encode. Wrap an item in &#x60;\&quot;&#x60; if it contains a comma or &#x60;\&quot;&#x60;; double a literal &#x60;\&quot;&#x60; to &#x60;\&quot;\&quot;&#x60; inside a quoted item.  | [Optional] [Defaults to `undefined`] |
| **multiValueAttributes** | `string` | CSV list of CEL expressions, each producing a &#x60;list&lt;comparable&gt;&#x60; (e.g. &#x60;interfaces.map(i, i.path)&#x60;, &#x60;correlationTags.map(t, t.tag)&#x60;, &#x60;primaryKey&#x60;, &#x60;fieldList.map(f, f.name)&#x60;). For each matching dataset, the expression\&#39;s list is flattened into a per-expression bag and counts are total occurrences — a single dataset contributes one increment per element. The flattened bag for each expression is capped at 10,000 values across all matching datasets; exceeding the cap returns 400.  Maximum 10 expressions. Either &#x60;attributes&#x60; or &#x60;multiValueAttributes&#x60; must be non-empty; both may be supplied together. &#x60;topK&#x60; applies independently to each entry of either array.  CSV-escape first, then URL-encode. Wrap an item in &#x60;\&quot;&#x60; if it contains a comma or &#x60;\&quot;&#x60;; double a literal &#x60;\&quot;&#x60; to &#x60;\&quot;\&quot;&#x60; inside a quoted item.  | [Optional] [Defaults to `undefined`] |

### Return type

[**DatasetStatsResponse**](DatasetStatsResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Dataset statistics retrieved successfully |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listDatasetGraph

> DatasetGraphResponse listDatasetGraph()

Get the full dataset graph

&gt; **Beta — schema may still change; breaking changes are coordinated &gt; with affected customers. Suitable for evaluation, not production &gt; reliance.**  Returns a lean per-dataset projection — &#x60;Dataset-GraphSummary&#x60; — for every dataset visible in the environment, plus the foreign-key and transform-input edges between them. Sorted by &#x60;id&#x60; ascending.  Designed to feed the Explore Universe graph in a single call. Intentionally unpaginated and intentionally unfiltered: this endpoint applies a fixed default filter that excludes monitors (&#x60;isMonitor&#x60;) and metric SMA datasets (&#x60;isMetricSMA&#x60;), and does not accept a CEL &#x60;filter&#x60; or &#x60;expand&#x60;. Always returns 200 with &#x60;meta.totalCount&#x60; equal to the number of returned datasets; the &#x60;-1&#x60; sentinel is not used here. Callers that need to defend against very large environments should cap on the client side.  For arbitrary filtering or pagination, use &#x60;GET /v1/datasets&#x60; instead. For the lineage neighborhood around a single dataset, use &#x60;GET /v1/datasets/{id}/graph&#x60;. 

### Example

```ts
import {
  Configuration,
  DatasetApi,
} from '';
import type { ListDatasetGraphRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new DatasetApi(config);

  try {
    const data = await api.listDatasetGraph();
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

This endpoint does not need any parameter.

### Return type

[**DatasetGraphResponse**](DatasetGraphResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Graph retrieved successfully |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listDatasets

> DatasetListResponse listDatasets(filter, orderBy, offset, limit, expand, query, minScore)

Get a list of datasets

Returns a paginated list of datasets the caller has read access to, optionally filtered and ordered with a CEL expression. Default page size is 50; maximum is 100. Default ordering is by &#x60;id&#x60; ascending.  Set &#x60;expand&#x3D;true&#x60; to inline reference fields (&#x60;createdBy&#x60;, &#x60;managedBy&#x60;, &#x60;storageIntegration.record&#x60;, …). Without &#x60;expand&#x60;, references contain only &#x60;id&#x60;.  ## Filtering and ordering with CEL  The &#x60;filter&#x60; and &#x60;orderBy&#x60; query parameters are evaluated as [Common Expression Language (CEL)](https://cel.dev) expressions against a stable schema that mirrors the dataset response body. &#x60;filter&#x60; must evaluate to &#x60;bool&#x60;; &#x60;orderBy&#x60; is a CSV list of CEL expressions whose values must be comparable. URL-encode both; CSV-escape &#x60;orderBy&#x60; items first (see the &#x60;orderBy&#x60; parameter for syntax).  Expressions that reference unknown fields, use the wrong type, or exceed the server-side cost limit return 400.  ### CEL → REST field mapping  With the exceptions noted below, every CEL field name matches the JSON key on &#x60;Dataset-Resource&#x60; 1‑to‑1, and CEL types map to JSON wire types as follows:  | CEL type            | JSON wire type                                   | | ------------------- | ------------------------------------------------ | | &#x60;string&#x60;, &#x60;string?&#x60; | string (or &#x60;null&#x60; when nullable)                 | | &#x60;bool&#x60;              | boolean                                          | | &#x60;int&#x60;               | integer                                          | | &#x60;timestamp&#x60;         | RFC 3339 string (e.g. &#x60;createdAt&#x60;, &#x60;updatedAt&#x60;)  | | &#x60;list(T)&#x60;           | array                                            | | &#x60;map(K, V)&#x60;         | object                                           | | Wrapper types       | nested object with the same sub-field names      |  Every &#x60;id&#x60; field — top-level and nested — is &#x60;int&#x60; in CEL but rendered as &#x60;string&#x60; in JSON (int64 values may overflow the JS number range). Compare with an integer literal in CEL: &#x60;id &#x3D;&#x3D; 41000234&#x60;, not &#x60;id &#x3D;&#x3D; \&quot;41000234\&quot;&#x60;.  ### Discrepancies between CEL and REST  | Field                          | CEL                                            | REST                                   | Notes                                                                                                                         | | ------------------------------ | ---------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | | &#x60;_name&#x60;, &#x60;_package&#x60;            | &#x60;string&#x60;, derived from &#x60;label&#x60;                 | not present                            | CEL-only convenience fields. &#x60;label &#x3D; \&quot;Logs/AWS/CloudTrail\&quot;&#x60; ⇒ &#x60;_package &#x3D; \&quot;Logs/AWS/\&quot;&#x60;, &#x60;_name &#x3D; \&quot;CloudTrail\&quot;&#x60;.              | | &#x60;createdAt&#x60;, &#x60;updatedAt&#x60;       | &#x60;timestamp&#x60;                                    | RFC 3339 string                        | In CEL, compare with &#x60;timestamp(\&quot;2024-01-01T00:00:00Z\&quot;)&#x60; or use &#x60;now() - duration(\&quot;24h\&quot;)&#x60;.                                     | | &#x60;storageIntegration.record.*&#x60;  | always loadable for filter evaluation          | only present when &#x60;expand&#x3D;true&#x60;        | A filter like &#x60;storageIntegration.record.label &#x3D;&#x3D; \&quot;snowflake-prod\&quot;&#x60; works on every request; the &#x60;record&#x60; object is only echoed back in the response when &#x60;expand&#x3D;true&#x60;. |  ### Available CEL functions  The dataset CEL environment registers the [CEL standard definitions](https://pkg.go.dev/github.com/google/cel-go@v0.28.0/cel#StdLib) (operators, &#x60;in&#x60;, &#x60;?:&#x60;, &#x60;size()&#x60;, &#x60;string.contains&#x60;, &#x60;string.startsWith&#x60;, &#x60;string.endsWith&#x60;, &#x60;matches&#x60;, etc.) plus the following extension libraries from [cel-go v0.28.0](https://pkg.go.dev/github.com/google/cel-go@v0.28.0/ext):  - [&#x60;ext.Strings&#x60;](https://pkg.go.dev/github.com/google/cel-go@v0.28.0/ext#Strings) — &#x60;charAt&#x60;, &#x60;indexOf&#x60;, &#x60;join&#x60;, &#x60;lowerAscii&#x60;, &#x60;replace&#x60;, &#x60;split&#x60;, &#x60;substring&#x60;, &#x60;trim&#x60;, &#x60;upperAscii&#x60;, &#x60;format&#x60; - [&#x60;ext.Lists&#x60;](https://pkg.go.dev/github.com/google/cel-go@v0.28.0/ext#Lists) — &#x60;lists.flatten&#x60;, &#x60;lists.range&#x60;, &#x60;lists.slice&#x60; - [&#x60;ext.Math&#x60;](https://pkg.go.dev/github.com/google/cel-go@v0.28.0/ext#Math) — &#x60;math.greatest&#x60;, &#x60;math.least&#x60; - [&#x60;ext.Sets&#x60;](https://pkg.go.dev/github.com/google/cel-go@v0.28.0/ext#Sets) — &#x60;sets.contains&#x60;, &#x60;sets.equivalent&#x60;, &#x60;sets.intersects&#x60; - [&#x60;ext.Regex&#x60;](https://pkg.go.dev/github.com/google/cel-go@v0.28.0/ext#Regex) — &#x60;re.capture&#x60;, &#x60;re.extract&#x60; - [&#x60;ext.Encoders&#x60;](https://pkg.go.dev/github.com/google/cel-go@v0.28.0/ext#Encoders) — &#x60;base64.encode&#x60;, &#x60;base64.decode&#x60; - [&#x60;ext.Bindings&#x60;](https://pkg.go.dev/github.com/google/cel-go@v0.28.0/ext#Bindings) — &#x60;cel.bind&#x60; for let-binding sub-expressions - [&#x60;ext.Protos&#x60;](https://pkg.go.dev/github.com/google/cel-go@v0.28.0/ext#Protos) — protobuf helpers - [&#x60;cel.OptionalTypes&#x60;](https://pkg.go.dev/github.com/google/cel-go@v0.28.0/cel#OptionalTypes) — &#x60;optional.of&#x60;, &#x60;optional.ofNonZero&#x60;, &#x60;optional.none&#x60;  See &#x60;Dataset-Resource&#x60; below for the full set of fields and types.  ## Semantic search  Pass &#x60;query&#x60; to find datasets by meaning rather than by exact field values. Results are ranked by relevance descending; &#x60;orderBy&#x60; is ignored when &#x60;query&#x60; is set. &#x60;meta.totalCount&#x60; is always &#x60;-1&#x60; for semantic-search requests because the full match count cannot be computed efficiently.  &#x60;filter&#x60; may be combined with &#x60;query&#x60; to narrow results after ranking. When both are set, the response may contain fewer than &#x60;limit&#x60; items if many ranked candidates are filtered out.  Returns 404 if semantic search is not available in this deployment. 

### Example

```ts
import {
  Configuration,
  DatasetApi,
} from '';
import type { ListDatasetsRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new DatasetApi(config);

  const body = {
    // string | CEL expression that response datasets must match. Must evaluate to `bool`. Must be URL-encoded. See the operation description for the CEL primer (field mapping, type discrepancies, available functions).  ## CEL functions  ### `hasCorrelationTag(tag string, value string) bool`  Returns `true` if this dataset has ever been associated with the correlation tag key-value pair `tag=value`.  Both arguments must be constant string literals. Field references, `cel.bind` names, and function calls are rejected with HTTP 400.  Error conditions: - HTTP 400 if a `(tag, value)` pair matches more than 10,000 datasets.   Narrow the tag name or value to reduce the match set. - HTTP 400 if this feature is not available for your account.   Contact support to enable correlation-tag filtering. - HTTP 503 if the tag index is temporarily unavailable. Retry after a short interval.  ### `hasCorrelationTag(tag string) bool`  Returns `true` if this dataset contains or inherits the correlation tag named `tag` (regardless of value).  The argument must be a constant string literal. Field references, `cel.bind` names, and function calls are rejected with HTTP 400.  (optional)
    filter: label == "Source" || id in [40000123, 40000456],
    // string | CSV list of CEL expressions, each producing a comparable value. Prefix an item with `-` for descending order. Default sort is `id` ascending; pagination is stable as long as no datasets are created or deleted between requests. CSV-escape first, then URL-encode. Wrap an item in `\"` if it contains a comma or `\"`; double a literal `\"` to `\"\"` inside a quoted item. **Ignored when `query` is set** — results are ordered by relevance when semantic search is active (see the Semantic search section in the operation description).  (optional)
    orderBy: "coalesce(managedBy.label, label)",-id,
    // number | Number of items to skip before starting to collect the result set (optional)
    offset: 789,
    // number | Maximum number of items to return in the response (optional)
    limit: 789,
    // boolean | Whether to expand resources referenced in the response to include additional fields (optional)
    expand: true,
    // string | Free-text search query. When set, returns datasets ranked by relevance to the query, with the most relevant results first. `orderBy` is ignored — results are always ordered by relevance descending. May be combined with `filter` to narrow results after ranking, and with `limit`/`offset` for pagination. When `filter` is also set, the response may contain fewer than `limit` items if many ranked candidates are filtered out. `meta.totalCount` is always `-1` for semantic-search requests. Returns 404 if semantic search is not available in this deployment.  (optional)
    query: customer purchase orders,
    // number | Minimum cosine similarity score (0.0–1.0) for semantic search results. Datasets scoring below this threshold are excluded. Only applies when `query` is set. Defaults to 0.3.  (optional)
    minScore: 1.2,
  } satisfies ListDatasetsRequest;

  try {
    const data = await api.listDatasets(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **filter** | `string` | CEL expression that response datasets must match. Must evaluate to &#x60;bool&#x60;. Must be URL-encoded. See the operation description for the CEL primer (field mapping, type discrepancies, available functions).  ## CEL functions  ### &#x60;hasCorrelationTag(tag string, value string) bool&#x60;  Returns &#x60;true&#x60; if this dataset has ever been associated with the correlation tag key-value pair &#x60;tag&#x3D;value&#x60;.  Both arguments must be constant string literals. Field references, &#x60;cel.bind&#x60; names, and function calls are rejected with HTTP 400.  Error conditions: - HTTP 400 if a &#x60;(tag, value)&#x60; pair matches more than 10,000 datasets.   Narrow the tag name or value to reduce the match set. - HTTP 400 if this feature is not available for your account.   Contact support to enable correlation-tag filtering. - HTTP 503 if the tag index is temporarily unavailable. Retry after a short interval.  ### &#x60;hasCorrelationTag(tag string) bool&#x60;  Returns &#x60;true&#x60; if this dataset contains or inherits the correlation tag named &#x60;tag&#x60; (regardless of value).  The argument must be a constant string literal. Field references, &#x60;cel.bind&#x60; names, and function calls are rejected with HTTP 400.  | [Optional] [Defaults to `undefined`] |
| **orderBy** | `string` | CSV list of CEL expressions, each producing a comparable value. Prefix an item with &#x60;-&#x60; for descending order. Default sort is &#x60;id&#x60; ascending; pagination is stable as long as no datasets are created or deleted between requests. CSV-escape first, then URL-encode. Wrap an item in &#x60;\&quot;&#x60; if it contains a comma or &#x60;\&quot;&#x60;; double a literal &#x60;\&quot;&#x60; to &#x60;\&quot;\&quot;&#x60; inside a quoted item. **Ignored when &#x60;query&#x60; is set** — results are ordered by relevance when semantic search is active (see the Semantic search section in the operation description).  | [Optional] [Defaults to `undefined`] |
| **offset** | `number` | Number of items to skip before starting to collect the result set | [Optional] [Defaults to `undefined`] |
| **limit** | `number` | Maximum number of items to return in the response | [Optional] [Defaults to `undefined`] |
| **expand** | `boolean` | Whether to expand resources referenced in the response to include additional fields | [Optional] [Defaults to `undefined`] |
| **query** | `string` | Free-text search query. When set, returns datasets ranked by relevance to the query, with the most relevant results first. &#x60;orderBy&#x60; is ignored — results are always ordered by relevance descending. May be combined with &#x60;filter&#x60; to narrow results after ranking, and with &#x60;limit&#x60;/&#x60;offset&#x60; for pagination. When &#x60;filter&#x60; is also set, the response may contain fewer than &#x60;limit&#x60; items if many ranked candidates are filtered out. &#x60;meta.totalCount&#x60; is always &#x60;-1&#x60; for semantic-search requests. Returns 404 if semantic search is not available in this deployment.  | [Optional] [Defaults to `undefined`] |
| **minScore** | `number` | Minimum cosine similarity score (0.0–1.0) for semantic search results. Datasets scoring below this threshold are excluded. Only applies when &#x60;query&#x60; is set. Defaults to 0.3.  | [Optional] [Defaults to `0.3`] |

### Return type

[**DatasetListResponse**](DatasetListResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Datasets queried successfully |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

