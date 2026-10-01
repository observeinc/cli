# TagsApi

All URIs are relative to *https://OBSERVE_CUSTOMERID.observeinc.com*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**listDatasetTags**](TagsApi.md#listdatasettags) | **GET** /v1/tags | List tags |



## listDatasetTags

> TagListResponse listDatasetTags(filter, orderBy, offset, limit, expand, sampleValues)

List tags

Returns a paginated list of tags (both correlation and metric kinds) defined across the tenant\&#39;s datasets. Each entry groups all per-dataset definitions of a single &#x60;(name, kind)&#x60; pair.  Use &#x60;GET /v1/tags/values&#x60; to search tag *values*.  ## Filtering and ordering with CEL  The &#x60;filter&#x60; and &#x60;orderBy&#x60; query parameters are evaluated as [Common Expression Language (CEL)](https://cel.dev) expressions over each tag in the response.  ### Available CEL fields  - &#x60;name&#x60; (string) — tag name; supports &#x60;.matches(\&quot;regex\&quot;)&#x60; - &#x60;kind&#x60; (string) — &#x60;\&quot;Correlation\&quot;&#x60; or &#x60;\&quot;Metric\&quot;&#x60; - &#x60;datasetCount&#x60; (int) — number of distinct datasets defining the tag - &#x60;mappings&#x60; (list) — per-dataset definitions; supports &#x60;.exists(m, ...)&#x60;   quantifier. Each &#x60;m&#x60; exposes:     - &#x60;m.dataset.id&#x60; (int) — dataset id     - &#x60;m.dataset.label&#x60; (string) — dataset label (available without       &#x60;expand&#x60;); matches the &#x60;dataset.record.label&#x60; returned in the body     - &#x60;m.path.field&#x60; (string)     - &#x60;m.path.path&#x60; (string)     - &#x60;m.origin.id&#x60; (int, null for Metric) — dataset where the mapping       was originally declared. Equals &#x60;m.dataset.id&#x60; when declared       directly on that dataset; differs when inherited from upstream.     - &#x60;m.origin.label&#x60; (string, null for Metric) — label of the origin       dataset; guard with &#x60;m.origin !&#x3D; null&#x60; before accessing.     - &#x60;m.createdBy.id&#x60; (int, null for Metric)  ### Available CEL functions  The tag CEL environment registers the [CEL standard definitions](https://pkg.go.dev/github.com/google/cel-go@v0.28.0/cel#StdLib) (operators, &#x60;in&#x60;, &#x60;?:&#x60;, &#x60;size()&#x60;, &#x60;string.contains&#x60;, &#x60;string.startsWith&#x60;, &#x60;string.endsWith&#x60;, &#x60;matches&#x60;, etc.) plus the following extension libraries from [cel-go v0.28.0](https://pkg.go.dev/github.com/google/cel-go@v0.28.0/ext):  - [&#x60;ext.Strings&#x60;](https://pkg.go.dev/github.com/google/cel-go@v0.28.0/ext#Strings) — &#x60;charAt&#x60;, &#x60;indexOf&#x60;, &#x60;join&#x60;, &#x60;lowerAscii&#x60;, &#x60;replace&#x60;, &#x60;split&#x60;, &#x60;substring&#x60;, &#x60;trim&#x60;, &#x60;upperAscii&#x60;, &#x60;format&#x60; - [&#x60;ext.Lists&#x60;](https://pkg.go.dev/github.com/google/cel-go@v0.28.0/ext#Lists) — &#x60;lists.flatten&#x60;, &#x60;lists.range&#x60;, &#x60;lists.slice&#x60; - [&#x60;ext.Math&#x60;](https://pkg.go.dev/github.com/google/cel-go@v0.28.0/ext#Math) — &#x60;math.greatest&#x60;, &#x60;math.least&#x60; - [&#x60;ext.Sets&#x60;](https://pkg.go.dev/github.com/google/cel-go@v0.28.0/ext#Sets) — &#x60;sets.contains&#x60;, &#x60;sets.equivalent&#x60;, &#x60;sets.intersects&#x60; - [&#x60;ext.Regex&#x60;](https://pkg.go.dev/github.com/google/cel-go@v0.28.0/ext#Regex) — &#x60;re.capture&#x60;, &#x60;re.extract&#x60; - [&#x60;ext.Encoders&#x60;](https://pkg.go.dev/github.com/google/cel-go@v0.28.0/ext#Encoders) — &#x60;base64.encode&#x60;, &#x60;base64.decode&#x60; - [&#x60;ext.Bindings&#x60;](https://pkg.go.dev/github.com/google/cel-go@v0.28.0/ext#Bindings) — &#x60;cel.bind&#x60; for let-binding sub-expressions - [&#x60;ext.Protos&#x60;](https://pkg.go.dev/github.com/google/cel-go@v0.28.0/ext#Protos) — protobuf helpers - [&#x60;cel.OptionalTypes&#x60;](https://pkg.go.dev/github.com/google/cel-go@v0.28.0/cel#OptionalTypes) — &#x60;optional.of&#x60;, &#x60;optional.ofNonZero&#x60;, &#x60;optional.none&#x60;  ### Defaults  - Default page size: 50; maximum: 100. - Default order: &#x60;kind&#x60; ascending, then &#x60;name&#x60; ascending.  Set &#x60;expand&#x3D;true&#x60; to inline the &#x60;dataset.record&#x60; brief (label, description, iconUrl, contentType) on every dataset reference.  Set &#x60;sampleValues&#x3D;true&#x60; to attach a bounded sample of each tag\&#39;s values (see the &#x60;sampleValues&#x60; parameter). 

### Example

```ts
import {
  Configuration,
  TagsApi,
} from '';
import type { ListDatasetTagsRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new TagsApi(config);

  const body = {
    // string | CEL expression that response tags must match. Must evaluate to `bool`. Must be URL-encoded. See the operation description for available fields.  (optional)
    filter: name.matches("^env.*"),
    // string | CSV CEL expressions; default `kind,name`. Prefix an item with `-` for descending. Supported expressions evaluate to comparable values (e.g. `name`, `kind`, `datasetCount`).  (optional)
    orderBy: kind,name,
    // number | Number of items to skip before starting to collect the result set (optional)
    offset: 789,
    // number | Maximum number of items to return in the response (optional)
    limit: 789,
    // boolean | Whether to expand resources referenced in the response to include additional fields (optional)
    expand: true,
    // boolean | When `true`, each returned tag includes up to 20 sample values in `sampleValues`. This is a bounded, non-paginated sample, NOT the full value set. Sampling is best-effort: `sampleValues` may be empty or absent for a tag whose values could not be retrieved. Use `GET /v1/tags/values` to search across tag values.  (optional)
    sampleValues: true,
  } satisfies ListDatasetTagsRequest;

  try {
    const data = await api.listDatasetTags(body);
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
| **filter** | `string` | CEL expression that response tags must match. Must evaluate to &#x60;bool&#x60;. Must be URL-encoded. See the operation description for available fields.  | [Optional] [Defaults to `undefined`] |
| **orderBy** | `string` | CSV CEL expressions; default &#x60;kind,name&#x60;. Prefix an item with &#x60;-&#x60; for descending. Supported expressions evaluate to comparable values (e.g. &#x60;name&#x60;, &#x60;kind&#x60;, &#x60;datasetCount&#x60;).  | [Optional] [Defaults to `undefined`] |
| **offset** | `number` | Number of items to skip before starting to collect the result set | [Optional] [Defaults to `undefined`] |
| **limit** | `number` | Maximum number of items to return in the response | [Optional] [Defaults to `undefined`] |
| **expand** | `boolean` | Whether to expand resources referenced in the response to include additional fields | [Optional] [Defaults to `undefined`] |
| **sampleValues** | `boolean` | When &#x60;true&#x60;, each returned tag includes up to 20 sample values in &#x60;sampleValues&#x60;. This is a bounded, non-paginated sample, NOT the full value set. Sampling is best-effort: &#x60;sampleValues&#x60; may be empty or absent for a tag whose values could not be retrieved. Use &#x60;GET /v1/tags/values&#x60; to search across tag values.  | [Optional] [Defaults to `false`] |

### Return type

[**TagListResponse**](TagListResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Tags retrieved successfully. |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

