# ObjectTagsApi

All URIs are relative to *https://OBSERVE_CUSTOMERID.observeinc.com*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**searchObjectTagKeys**](ObjectTagsApi.md#searchobjecttagkeys) | **GET** /v1/object-tags/search | Search object tag keys |
| [**searchObjectTagValues**](ObjectTagsApi.md#searchobjecttagvalues) | **GET** /v1/object-tags/search/{key} | Search values for an object tag key |



## searchObjectTagKeys

> ObjectTagKeysSearchResponse searchObjectTagKeys(filter, limit)

Search object tag keys

Returns unique tag keys used across objects such as dashboards, datasets, worksheets, etc. Results are sorted by object count (descending), then alphabetically. Filter performs case-insensitive substring matching. 

### Example

```ts
import {
  Configuration,
  ObjectTagsApi,
} from '';
import type { SearchObjectTagKeysRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ObjectTagsApi(config);

  const body = {
    // string | Filter keys to those containing this substring (case-insensitive) (optional)
    filter: filter_example,
    // number | Maximum number of items to return in the response (optional)
    limit: 789,
  } satisfies SearchObjectTagKeysRequest;

  try {
    const data = await api.searchObjectTagKeys(body);
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
| **filter** | `string` | Filter keys to those containing this substring (case-insensitive) | [Optional] [Defaults to `undefined`] |
| **limit** | `number` | Maximum number of items to return in the response | [Optional] [Defaults to `undefined`] |

### Return type

[**ObjectTagKeysSearchResponse**](ObjectTagKeysSearchResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Tag keys retrieved successfully |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## searchObjectTagValues

> ObjectTagValuesSearchResponse searchObjectTagValues(key, filter, limit)

Search values for an object tag key

Returns unique values for a specific tag key across objects such as dashboards, datasets, worksheets, etc. Results are sorted by object count (descending), then alphabetically. Filter performs case-insensitive substring matching. 

### Example

```ts
import {
  Configuration,
  ObjectTagsApi,
} from '';
import type { SearchObjectTagValuesRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ObjectTagsApi(config);

  const body = {
    // string | The tag key to get values for
    key: environment,
    // string | Filter values to those containing this substring (case-insensitive) (optional)
    filter: filter_example,
    // number | Maximum number of items to return in the response (optional)
    limit: 789,
  } satisfies SearchObjectTagValuesRequest;

  try {
    const data = await api.searchObjectTagValues(body);
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
| **key** | `string` | The tag key to get values for | [Defaults to `undefined`] |
| **filter** | `string` | Filter values to those containing this substring (case-insensitive) | [Optional] [Defaults to `undefined`] |
| **limit** | `number` | Maximum number of items to return in the response | [Optional] [Defaults to `undefined`] |

### Return type

[**ObjectTagValuesSearchResponse**](ObjectTagValuesSearchResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Tag values retrieved successfully |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

