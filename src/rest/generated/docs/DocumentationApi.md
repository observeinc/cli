# DocumentationApi

All URIs are relative to *https://OBSERVE_CUSTOMERID.observeinc.com*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**searchDocumentation**](DocumentationApi.md#searchdocumentation) | **POST** /v1/documentation/search | Search documentation |



## searchDocumentation

> DocumentationSearchResponse searchDocumentation(documentationSearchRequest)

Search documentation

Semantic search across Observe\&#39;s built-in documentation. Given a natural-language query, returns the most relevant documentation chunks ranked by cosine similarity.  Results are returned at the chunk level, not whole documents. A single documentation page may be split into multiple chunks, each with its own embedding and score. Multiple chunks from the same source page can appear in the results. 

### Example

```ts
import {
  Configuration,
  DocumentationApi,
} from '';
import type { SearchDocumentationRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new DocumentationApi(config);

  const body = {
    // DocumentationSearchRequest
    documentationSearchRequest: ...,
  } satisfies SearchDocumentationRequest;

  try {
    const data = await api.searchDocumentation(body);
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
| **documentationSearchRequest** | [DocumentationSearchRequest](DocumentationSearchRequest.md) |  | |

### Return type

[**DocumentationSearchResponse**](DocumentationSearchResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Search completed successfully |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

