# IngestTokensApi

All URIs are relative to *https://OBSERVE_CUSTOMERID.observeinc.com*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**createIngestToken**](IngestTokensApi.md#createingesttoken) | **POST** /v1/ingest/tokens | Create an ingest token |
| [**deleteIngestToken**](IngestTokensApi.md#deleteingesttoken) | **DELETE** /v1/ingest/tokens/{id} | Delete an ingest token |
| [**getIngestToken**](IngestTokensApi.md#getingesttoken) | **GET** /v1/ingest/tokens/{id} | Get an ingest token |
| [**listIngestTokens**](IngestTokensApi.md#listingesttokens) | **GET** /v1/ingest/tokens | List ingest tokens |
| [**updateIngestToken**](IngestTokensApi.md#updateingesttoken) | **PATCH** /v1/ingest/tokens/{id} | Update an ingest token |



## createIngestToken

> IngestTokenCreateResponse createIngestToken(ingestTokenCreateRequest, expand)

Create an ingest token

Creates an ingest token. The secret is returned exactly once in the response and cannot be retrieved again.  **Quota:** A customer can hold at most a fixed number of ingest tokens (default 5000). Exceeding this returns &#x60;403&#x60; with type &#x60;quota_exceeded&#x60;. Contact Observe support to raise the cap. 

### Example

```ts
import {
  Configuration,
  IngestTokensApi,
} from '';
import type { CreateIngestTokenRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new IngestTokensApi(config);

  const body = {
    // IngestTokenCreateRequest
    ingestTokenCreateRequest: ...,
    // boolean | Whether to expand resources referenced in the response to include additional fields (optional)
    expand: true,
  } satisfies CreateIngestTokenRequest;

  try {
    const data = await api.createIngestToken(body);
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
| **ingestTokenCreateRequest** | [IngestTokenCreateRequest](IngestTokenCreateRequest.md) |  | |
| **expand** | `boolean` | Whether to expand resources referenced in the response to include additional fields | [Optional] [Defaults to `undefined`] |

### Return type

[**IngestTokenCreateResponse**](IngestTokenCreateResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **201** | Ingest token created successfully. |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **409** | Conflict |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## deleteIngestToken

> deleteIngestToken(id)

Delete an ingest token

Returns 204 on success, 403 if the caller lacks permission to delete the token, 404 if the token does not exist or is not visible to the caller. 

### Example

```ts
import {
  Configuration,
  IngestTokensApi,
} from '';
import type { DeleteIngestTokenRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new IngestTokensApi(config);

  const body = {
    // string | The stable token id (the `ds1...` string).
    id: id_example,
  } satisfies DeleteIngestTokenRequest;

  try {
    const data = await api.deleteIngestToken(body);
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
| **id** | `string` | The stable token id (the &#x60;ds1...&#x60; string). | [Defaults to `undefined`] |

### Return type

`void` (Empty response body)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **204** | Ingest token deleted. |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **404** | Resource not found |  -  |
| **422** | Unprocessable entity — a required query parameter was omitted (e.g. &#x60;missing_field&#x60;). |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getIngestToken

> IngestTokenResource getIngestToken(id, expand)

Get an ingest token

### Example

```ts
import {
  Configuration,
  IngestTokensApi,
} from '';
import type { GetIngestTokenRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new IngestTokensApi(config);

  const body = {
    // string | The stable token id (the `ds1...` string).
    id: id_example,
    // boolean | Whether to expand resources referenced in the response to include additional fields (optional)
    expand: true,
  } satisfies GetIngestTokenRequest;

  try {
    const data = await api.getIngestToken(body);
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
| **id** | `string` | The stable token id (the &#x60;ds1...&#x60; string). | [Defaults to `undefined`] |
| **expand** | `boolean` | Whether to expand resources referenced in the response to include additional fields | [Optional] [Defaults to `undefined`] |

### Return type

[**IngestTokenResource**](IngestTokenResource.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Ingest token returned successfully. |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **404** | Resource not found |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listIngestTokens

> IngestTokenListResponse listIngestTokens(filter, offset, limit, orderBy, expand)

List ingest tokens

When &#x60;expand&#x3D;true&#x60;, each token\&#39;s &#x60;stats&#x60; (ingest health metrics) are included. A token that has not yet ingested any data has no metrics to report, so &#x60;stats&#x60; is omitted for it until it is first used. 

### Example

```ts
import {
  Configuration,
  IngestTokensApi,
} from '';
import type { ListIngestTokensRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new IngestTokensApi(config);

  const body = {
    // string | CEL expression to filter results. Variables: `id` (string), `name` (string), `description` (string), `disabled` (bool). Supports `matches()` for regex. Example: `name.matches(\"prod.*\") && disabled == false`. (optional)
    filter: filter_example,
    // number (optional)
    offset: 56,
    // number | Max items to return. Default 20; max 100. Values greater than 100 are capped to 100. (optional)
    limit: 56,
    // string | Comma-separated columns; prefix with `-` for descending. Allowed: `id`, `name`, `createdAt`, `updatedAt`. Default: `-createdAt`,`id`. (optional)
    orderBy: orderBy_example,
    // boolean | Whether to expand resources referenced in the response to include additional fields (optional)
    expand: true,
  } satisfies ListIngestTokensRequest;

  try {
    const data = await api.listIngestTokens(body);
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
| **filter** | `string` | CEL expression to filter results. Variables: &#x60;id&#x60; (string), &#x60;name&#x60; (string), &#x60;description&#x60; (string), &#x60;disabled&#x60; (bool). Supports &#x60;matches()&#x60; for regex. Example: &#x60;name.matches(\&quot;prod.*\&quot;) &amp;&amp; disabled &#x3D;&#x3D; false&#x60;. | [Optional] [Defaults to `undefined`] |
| **offset** | `number` |  | [Optional] [Defaults to `undefined`] |
| **limit** | `number` | Max items to return. Default 20; max 100. Values greater than 100 are capped to 100. | [Optional] [Defaults to `undefined`] |
| **orderBy** | `string` | Comma-separated columns; prefix with &#x60;-&#x60; for descending. Allowed: &#x60;id&#x60;, &#x60;name&#x60;, &#x60;createdAt&#x60;, &#x60;updatedAt&#x60;. Default: &#x60;-createdAt&#x60;,&#x60;id&#x60;. | [Optional] [Defaults to `undefined`] |
| **expand** | `boolean` | Whether to expand resources referenced in the response to include additional fields | [Optional] [Defaults to `undefined`] |

### Return type

[**IngestTokenListResponse**](IngestTokenListResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Ingest tokens listed successfully. |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## updateIngestToken

> IngestTokenResource updateIngestToken(id, ingestTokenUpdateRequest, expand)

Update an ingest token

Merge-patch (RFC 7396). Omitted fields are unchanged. 

### Example

```ts
import {
  Configuration,
  IngestTokensApi,
} from '';
import type { UpdateIngestTokenRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new IngestTokensApi(config);

  const body = {
    // string | The stable token id (the `ds1...` string).
    id: id_example,
    // IngestTokenUpdateRequest
    ingestTokenUpdateRequest: ...,
    // boolean | Whether to expand resources referenced in the response to include additional fields (optional)
    expand: true,
  } satisfies UpdateIngestTokenRequest;

  try {
    const data = await api.updateIngestToken(body);
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
| **id** | `string` | The stable token id (the &#x60;ds1...&#x60; string). | [Defaults to `undefined`] |
| **ingestTokenUpdateRequest** | [IngestTokenUpdateRequest](IngestTokenUpdateRequest.md) |  | |
| **expand** | `boolean` | Whether to expand resources referenced in the response to include additional fields | [Optional] [Defaults to `undefined`] |

### Return type

[**IngestTokenResource**](IngestTokenResource.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Ingest token updated successfully. |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **404** | Resource not found |  -  |
| **409** | Conflict |  -  |
| **422** | Unprocessable entity — a required query parameter was omitted (e.g. &#x60;missing_field&#x60;). |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

