# TagValuesApi

All URIs are relative to *https://OBSERVE_CUSTOMERID.observeinc.com*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**searchTagValues**](TagValuesApi.md#searchtagvalues) | **GET** /v1/tags/values | Search tag values |



## searchTagValues

> TagValuesResponse searchTagValues(query, mode, kind, limit, offset)

Search tag values

Returns tag values matching the query. Use &#x60;Regex&#x60; to interpret &#x60;query&#x60; as a regular expression, or &#x60;Semantic&#x60; for semantic similarity search. 

### Example

```ts
import {
  Configuration,
  TagValuesApi,
} from '';
import type { SearchTagValuesRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new TagValuesApi(config);

  const body = {
    // string | Text to search for.
    query: query_example,
    // TagValuesSearchMode | How `query` is interpreted when matching tags.
    mode: ...,
    // TagKind | Kind of tag to search for. (optional)
    kind: ...,
    // number | Maximum number of items to return in the response (optional)
    limit: 789,
    // number | Number of items to skip before starting to collect the result set (optional)
    offset: 789,
  } satisfies SearchTagValuesRequest;

  try {
    const data = await api.searchTagValues(body);
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
| **query** | `string` | Text to search for. | [Defaults to `undefined`] |
| **mode** | `TagValuesSearchMode` | How &#x60;query&#x60; is interpreted when matching tags. | [Defaults to `undefined`] [Enum: Regex, Semantic] |
| **kind** | `TagKind` | Kind of tag to search for. | [Optional] [Defaults to `undefined`] [Enum: Metric, Correlation] |
| **limit** | `number` | Maximum number of items to return in the response | [Optional] [Defaults to `undefined`] |
| **offset** | `number` | Number of items to skip before starting to collect the result set | [Optional] [Defaults to `undefined`] |

### Return type

[**TagValuesResponse**](TagValuesResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Matching tag name-value pairs. |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

