# MetricsApi

All URIs are relative to *https://OBSERVE_CUSTOMERID.observeinc.com*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**listMetrics**](MetricsApi.md#listmetrics) | **GET** /v1/metrics | List metrics |



## listMetrics

> MetricListResponse listMetrics(limit, offset, expand, orderBy, filter)

List metrics

List metrics defined by, or auto-discovered in, the customer\&#39;s metric datasets that the user has read access to. Default page size is 100; maximum is 1000. Default ordering is by &#x60;name&#x60; ascending, then &#x60;dataset.id&#x60; ascending. Set &#x60;expand&#x3D;true&#x60; to inline reference fields (&#x60;dataset.record&#x60;, …). Without &#x60;expand&#x60;, references contain only &#x60;id&#x60;.  ## Filtering and ordering with CEL The &#x60;filter&#x60; and &#x60;orderBy&#x60; query parameters are evaluated as [Common Expression Language (CEL)](https://cel.dev) expressions against a stable schema that mirrors the metric response body. &#x60;filter&#x60; must evaluate to &#x60;bool&#x60;; &#x60;orderBy&#x60; is a CSV list of CEL expressions whose values must be comparable. URL-encode both; CSV-escape &#x60;orderBy&#x60; items first (see the &#x60;orderBy&#x60; parameter for syntax).  ### Discrepancies between CEL and REST  | Field         | CEL                                                     | REST         | Notes                                                                                                                     | | ------------- | -------------------------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------- | | &#x60;objectTags&#x60;  | &#x60;map(string, list(string))&#x60;, from the metric\&#39;s dataset\&#39;s object tags | not present  | CEL-only convenience field. Filter with &#x60;\&quot;env\&quot; in objectTags&#x60;; to read the tags, fetch the dataset via &#x60;dataset.id&#x60;. |  ### Available CEL functions The metric CEL environment registers the [CEL standard definitions](https://pkg.go.dev/github.com/google/cel-go@v0.28.0/cel#StdLib) (operators, &#x60;in&#x60;, &#x60;?:&#x60;, &#x60;size()&#x60;, &#x60;string.contains&#x60;, &#x60;string.startsWith&#x60;, &#x60;string.endsWith&#x60;, &#x60;matches&#x60;, etc.) plus the following extension libraries from [cel-go v0.28.0](https://pkg.go.dev/github.com/google/cel-go@v0.28.0/ext):  - [&#x60;ext.Strings&#x60;](https://pkg.go.dev/github.com/google/cel-go@v0.28.0/ext#Strings) — &#x60;charAt&#x60;, &#x60;indexOf&#x60;, &#x60;join&#x60;, &#x60;lowerAscii&#x60;, &#x60;replace&#x60;, &#x60;split&#x60;, &#x60;substring&#x60;, &#x60;trim&#x60;, &#x60;upperAscii&#x60;, &#x60;format&#x60; - [&#x60;ext.Lists&#x60;](https://pkg.go.dev/github.com/google/cel-go@v0.28.0/ext#Lists) — &#x60;lists.flatten&#x60;, &#x60;lists.range&#x60;, &#x60;lists.slice&#x60; - [&#x60;ext.Math&#x60;](https://pkg.go.dev/github.com/google/cel-go@v0.28.0/ext#Math) — &#x60;math.greatest&#x60;, &#x60;math.least&#x60; - [&#x60;ext.Sets&#x60;](https://pkg.go.dev/github.com/google/cel-go@v0.28.0/ext#Sets) — &#x60;sets.contains&#x60;, &#x60;sets.equivalent&#x60;, &#x60;sets.intersects&#x60; - [&#x60;ext.Regex&#x60;](https://pkg.go.dev/github.com/google/cel-go@v0.28.0/ext#Regex) — &#x60;re.capture&#x60;, &#x60;re.extract&#x60; - [&#x60;ext.Encoders&#x60;](https://pkg.go.dev/github.com/google/cel-go@v0.28.0/ext#Encoders) — &#x60;base64.encode&#x60;, &#x60;base64.decode&#x60; - [&#x60;ext.Bindings&#x60;](https://pkg.go.dev/github.com/google/cel-go@v0.28.0/ext#Bindings) — &#x60;cel.bind&#x60; for let-binding sub-expressions - [&#x60;ext.Protos&#x60;](https://pkg.go.dev/github.com/google/cel-go@v0.28.0/ext#Protos) — protobuf helpers - [&#x60;cel.OptionalTypes&#x60;](https://pkg.go.dev/github.com/google/cel-go@v0.28.0/cel#OptionalTypes) — &#x60;optional.of&#x60;, &#x60;optional.ofNonZero&#x60;, &#x60;optional.none&#x60; 

### Example

```ts
import {
  Configuration,
  MetricsApi,
} from '';
import type { ListMetricsRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new MetricsApi(config);

  const body = {
    // number | Maximum number of items to return in the response (optional)
    limit: 789,
    // number | Number of items to skip before starting to collect the result set (optional)
    offset: 789,
    // boolean | Whether to expand resources referenced in the response to include additional fields (optional)
    expand: true,
    // string | CSV list of CEL expressions, each producing a comparable value. Prefix an item with `-` for descending order.  CSV-escape first, then URL-encode. Wrap an item in `\"` if it contains a comma or `\"`; double a literal `\"` to `\"\"` inside a quoted item.  Supported fields: See the description of the `filter` parameter for the list of supported fields.  (optional)
    orderBy: -lastReported,name,
    // string | Filter that response metrics must match. Specified in CEL format. Note that filter expressions must be URL encoded.  Supported filter fields: - `name` (string): metric name - `type` (string): metric type - `unit` (string): metric unit - `description` (string): metric description - `rollup` (string): metric rollup - `aggregate` (string): metric aggregate - `userDefined` (bool): whether the metric is user-defined - `status` (string): metric status - `dataset.id` (int): ID of the metric dataset - `dataset.label` (string): label of the metric dataset - `lastReported` (timestamp): last reported time - `metricTags` (list): tag paths observed for this metric. Each   element is an object with `field` (string) and `path` (string).   Use CEL macros to test membership, e.g.   `metricTags.exists(t, t.field == \"container\")`. - `correlationTags` (list): correlation tags relevant to this   metric. Each element is an object with `tag` (string) and `path`   (an object with `field` and `path`). e.g.   `correlationTags.exists(c, c.tag == \"service.name\")`. - `objectTags` (map of string to list of string): user-applied   object tags on the metric\'s dataset. Test membership with `in`,   e.g. `\"env\" in objectTags` or   `\"env\" in objectTags && \"prod\" in objectTags[\"env\"]`.  See the Metric-Resource schema for the detailed descriptions of the supported fields.  ## CEL functions  ### `hasCorrelationTag(tag string, value string) bool`  Returns `true` if this metric has data points whose correlation tag `tag` takes on `value` within a recent observation window.  Both arguments must be constant string literals.  Limits and error conditions: - HTTP 400 if a single filter references more than 8 unique   `hasCorrelationTag(T, V)` callsites. - For each `(tag, value)` pair, fan-out is capped at 10 candidate   datasets, selected deterministically in ascending dataset id.   Datasets beyond the cap are not consulted for that pair. - HTTP 500 if the OPAL query fails (e.g. Snowflake unavailable). - HTTP 503 if no query backend is wired (test / degraded apiserver).  (optional)
    filter: name == "cpu_usage",
  } satisfies ListMetricsRequest;

  try {
    const data = await api.listMetrics(body);
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
| **limit** | `number` | Maximum number of items to return in the response | [Optional] [Defaults to `undefined`] |
| **offset** | `number` | Number of items to skip before starting to collect the result set | [Optional] [Defaults to `undefined`] |
| **expand** | `boolean` | Whether to expand resources referenced in the response to include additional fields | [Optional] [Defaults to `undefined`] |
| **orderBy** | `string` | CSV list of CEL expressions, each producing a comparable value. Prefix an item with &#x60;-&#x60; for descending order.  CSV-escape first, then URL-encode. Wrap an item in &#x60;\&quot;&#x60; if it contains a comma or &#x60;\&quot;&#x60;; double a literal &#x60;\&quot;&#x60; to &#x60;\&quot;\&quot;&#x60; inside a quoted item.  Supported fields: See the description of the &#x60;filter&#x60; parameter for the list of supported fields.  | [Optional] [Defaults to `undefined`] |
| **filter** | `string` | Filter that response metrics must match. Specified in CEL format. Note that filter expressions must be URL encoded.  Supported filter fields: - &#x60;name&#x60; (string): metric name - &#x60;type&#x60; (string): metric type - &#x60;unit&#x60; (string): metric unit - &#x60;description&#x60; (string): metric description - &#x60;rollup&#x60; (string): metric rollup - &#x60;aggregate&#x60; (string): metric aggregate - &#x60;userDefined&#x60; (bool): whether the metric is user-defined - &#x60;status&#x60; (string): metric status - &#x60;dataset.id&#x60; (int): ID of the metric dataset - &#x60;dataset.label&#x60; (string): label of the metric dataset - &#x60;lastReported&#x60; (timestamp): last reported time - &#x60;metricTags&#x60; (list): tag paths observed for this metric. Each   element is an object with &#x60;field&#x60; (string) and &#x60;path&#x60; (string).   Use CEL macros to test membership, e.g.   &#x60;metricTags.exists(t, t.field &#x3D;&#x3D; \&quot;container\&quot;)&#x60;. - &#x60;correlationTags&#x60; (list): correlation tags relevant to this   metric. Each element is an object with &#x60;tag&#x60; (string) and &#x60;path&#x60;   (an object with &#x60;field&#x60; and &#x60;path&#x60;). e.g.   &#x60;correlationTags.exists(c, c.tag &#x3D;&#x3D; \&quot;service.name\&quot;)&#x60;. - &#x60;objectTags&#x60; (map of string to list of string): user-applied   object tags on the metric\&#39;s dataset. Test membership with &#x60;in&#x60;,   e.g. &#x60;\&quot;env\&quot; in objectTags&#x60; or   &#x60;\&quot;env\&quot; in objectTags &amp;&amp; \&quot;prod\&quot; in objectTags[\&quot;env\&quot;]&#x60;.  See the Metric-Resource schema for the detailed descriptions of the supported fields.  ## CEL functions  ### &#x60;hasCorrelationTag(tag string, value string) bool&#x60;  Returns &#x60;true&#x60; if this metric has data points whose correlation tag &#x60;tag&#x60; takes on &#x60;value&#x60; within a recent observation window.  Both arguments must be constant string literals.  Limits and error conditions: - HTTP 400 if a single filter references more than 8 unique   &#x60;hasCorrelationTag(T, V)&#x60; callsites. - For each &#x60;(tag, value)&#x60; pair, fan-out is capped at 10 candidate   datasets, selected deterministically in ascending dataset id.   Datasets beyond the cap are not consulted for that pair. - HTTP 500 if the OPAL query fails (e.g. Snowflake unavailable). - HTTP 503 if no query backend is wired (test / degraded apiserver).  | [Optional] [Defaults to `undefined`] |

### Return type

[**MetricListResponse**](MetricListResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Metrics queried successfully |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **404** | Resource not found |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

