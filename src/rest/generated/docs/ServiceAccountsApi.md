# ServiceAccountsApi

All URIs are relative to *https://OBSERVE_CUSTOMERID.observeinc.com*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**createApiToken**](ServiceAccountsApi.md#createapitoken) | **POST** /v1/service-accounts/{accountId}/api-tokens | Create an API token |
| [**createServiceAccount**](ServiceAccountsApi.md#createserviceaccount) | **POST** /v1/service-accounts | Create a service account |
| [**deleteApiToken**](ServiceAccountsApi.md#deleteapitoken) | **DELETE** /v1/service-accounts/{accountId}/api-tokens/{tokenId} | Delete an API token |
| [**deleteServiceAccount**](ServiceAccountsApi.md#deleteserviceaccount) | **DELETE** /v1/service-accounts/{accountId} | Delete a service account |
| [**getApiToken**](ServiceAccountsApi.md#getapitoken) | **GET** /v1/service-accounts/{accountId}/api-tokens/{tokenId} | Get an API token |
| [**getServiceAccount**](ServiceAccountsApi.md#getserviceaccount) | **GET** /v1/service-accounts/{accountId} | Get a service account |
| [**listApiTokens**](ServiceAccountsApi.md#listapitokens) | **GET** /v1/service-accounts/{accountId}/api-tokens | Get a list of API tokens for this service account |
| [**listServiceAccounts**](ServiceAccountsApi.md#listserviceaccounts) | **GET** /v1/service-accounts | Get a list of service accounts |
| [**updateApiToken**](ServiceAccountsApi.md#updateapitoken) | **PATCH** /v1/service-accounts/{accountId}/api-tokens/{tokenId} | Update an API token |
| [**updateServiceAccount**](ServiceAccountsApi.md#updateserviceaccount) | **PATCH** /v1/service-accounts/{accountId} | Update a service account |



## createApiToken

> ApiTokenResource createApiToken(accountId, apiTokenCreateRequest, expand)

Create an API token

### Example

```ts
import {
  Configuration,
  ServiceAccountsApi,
} from '';
import type { CreateApiTokenRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ServiceAccountsApi(config);

  const body = {
    // string | The id of the service account associated with the API token
    accountId: 1,
    // ApiTokenCreateRequest
    apiTokenCreateRequest: ...,
    // boolean | Whether to expand resources referenced in the response to include additional fields (optional)
    expand: true,
  } satisfies CreateApiTokenRequest;

  try {
    const data = await api.createApiToken(body);
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
| **accountId** | `string` | The id of the service account associated with the API token | [Defaults to `undefined`] |
| **apiTokenCreateRequest** | [ApiTokenCreateRequest](ApiTokenCreateRequest.md) |  | |
| **expand** | `boolean` | Whether to expand resources referenced in the response to include additional fields | [Optional] [Defaults to `undefined`] |

### Return type

[**ApiTokenResource**](ApiTokenResource.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **201** | API token created successfully |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## createServiceAccount

> ServiceAccountResource createServiceAccount(serviceAccountCreateRequest, expand)

Create a service account

### Example

```ts
import {
  Configuration,
  ServiceAccountsApi,
} from '';
import type { CreateServiceAccountRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ServiceAccountsApi(config);

  const body = {
    // ServiceAccountCreateRequest
    serviceAccountCreateRequest: ...,
    // boolean | Whether to expand resources referenced in the response to include additional fields (optional)
    expand: true,
  } satisfies CreateServiceAccountRequest;

  try {
    const data = await api.createServiceAccount(body);
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
| **serviceAccountCreateRequest** | [ServiceAccountCreateRequest](ServiceAccountCreateRequest.md) |  | |
| **expand** | `boolean` | Whether to expand resources referenced in the response to include additional fields | [Optional] [Defaults to `undefined`] |

### Return type

[**ServiceAccountResource**](ServiceAccountResource.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **201** | Service account created successfully |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## deleteApiToken

> deleteApiToken(accountId, tokenId)

Delete an API token

### Example

```ts
import {
  Configuration,
  ServiceAccountsApi,
} from '';
import type { DeleteApiTokenRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ServiceAccountsApi(config);

  const body = {
    // string | The id of the service account associated with the API token
    accountId: 1,
    // string | The id of the API token to update
    tokenId: 1,
  } satisfies DeleteApiTokenRequest;

  try {
    const data = await api.deleteApiToken(body);
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
| **accountId** | `string` | The id of the service account associated with the API token | [Defaults to `undefined`] |
| **tokenId** | `string` | The id of the API token to update | [Defaults to `undefined`] |

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
| **200** | API token deleted successfully |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## deleteServiceAccount

> deleteServiceAccount(accountId)

Delete a service account

### Example

```ts
import {
  Configuration,
  ServiceAccountsApi,
} from '';
import type { DeleteServiceAccountRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ServiceAccountsApi(config);

  const body = {
    // string | The id of the service account to delete
    accountId: 1,
  } satisfies DeleteServiceAccountRequest;

  try {
    const data = await api.deleteServiceAccount(body);
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
| **accountId** | `string` | The id of the service account to delete | [Defaults to `undefined`] |

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
| **200** | Service account deleted successfully |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getApiToken

> ApiTokenResource getApiToken(accountId, tokenId, expand)

Get an API token

Retrieve a specific API token by ID

### Example

```ts
import {
  Configuration,
  ServiceAccountsApi,
} from '';
import type { GetApiTokenRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ServiceAccountsApi(config);

  const body = {
    // string | The id of the service account associated with the API token
    accountId: 1,
    // string | The id of the API token to update
    tokenId: 1,
    // boolean | Whether to expand resources referenced in the response to include additional fields (optional)
    expand: true,
  } satisfies GetApiTokenRequest;

  try {
    const data = await api.getApiToken(body);
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
| **accountId** | `string` | The id of the service account associated with the API token | [Defaults to `undefined`] |
| **tokenId** | `string` | The id of the API token to update | [Defaults to `undefined`] |
| **expand** | `boolean` | Whether to expand resources referenced in the response to include additional fields | [Optional] [Defaults to `undefined`] |

### Return type

[**ApiTokenResource**](ApiTokenResource.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | API token queried successfully |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **404** | Resource not found |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getServiceAccount

> ServiceAccountResource getServiceAccount(accountId, expand)

Get a service account

Retrieve a specific service account by ID

### Example

```ts
import {
  Configuration,
  ServiceAccountsApi,
} from '';
import type { GetServiceAccountRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ServiceAccountsApi(config);

  const body = {
    // string | The id of the service account
    accountId: 1,
    // boolean | Whether to expand resources referenced in the response to include additional fields (optional)
    expand: true,
  } satisfies GetServiceAccountRequest;

  try {
    const data = await api.getServiceAccount(body);
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
| **accountId** | `string` | The id of the service account | [Defaults to `undefined`] |
| **expand** | `boolean` | Whether to expand resources referenced in the response to include additional fields | [Optional] [Defaults to `undefined`] |

### Return type

[**ServiceAccountResource**](ServiceAccountResource.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Service account queried successfully |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **404** | Resource not found |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listApiTokens

> ApiTokenListResponse listApiTokens(accountId, expand)

Get a list of API tokens for this service account

Get a list of all API tokens for this service account

### Example

```ts
import {
  Configuration,
  ServiceAccountsApi,
} from '';
import type { ListApiTokensRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ServiceAccountsApi(config);

  const body = {
    // string | The id of the service account associated with the API token
    accountId: 1,
    // boolean | Whether to expand resources referenced in the response to include additional fields (optional)
    expand: true,
  } satisfies ListApiTokensRequest;

  try {
    const data = await api.listApiTokens(body);
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
| **accountId** | `string` | The id of the service account associated with the API token | [Defaults to `undefined`] |
| **expand** | `boolean` | Whether to expand resources referenced in the response to include additional fields | [Optional] [Defaults to `undefined`] |

### Return type

[**ApiTokenListResponse**](ApiTokenListResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | API tokens queried successfully |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listServiceAccounts

> ServiceAccountListResponse listServiceAccounts(expand)

Get a list of service accounts

Get a list of all service accounts

### Example

```ts
import {
  Configuration,
  ServiceAccountsApi,
} from '';
import type { ListServiceAccountsRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ServiceAccountsApi(config);

  const body = {
    // boolean | Whether to expand resources referenced in the response to include additional fields (optional)
    expand: true,
  } satisfies ListServiceAccountsRequest;

  try {
    const data = await api.listServiceAccounts(body);
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
| **expand** | `boolean` | Whether to expand resources referenced in the response to include additional fields | [Optional] [Defaults to `undefined`] |

### Return type

[**ServiceAccountListResponse**](ServiceAccountListResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Service account queried successfully |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## updateApiToken

> ApiTokenResource updateApiToken(accountId, tokenId, apiTokenUpdateRequest, expand)

Update an API token

### Example

```ts
import {
  Configuration,
  ServiceAccountsApi,
} from '';
import type { UpdateApiTokenRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ServiceAccountsApi(config);

  const body = {
    // string | The id of the service account associated with the API token
    accountId: 1,
    // string | The id of the API token to update
    tokenId: 1,
    // ApiTokenUpdateRequest
    apiTokenUpdateRequest: ...,
    // boolean | Whether to expand resources referenced in the response to include additional fields (optional)
    expand: true,
  } satisfies UpdateApiTokenRequest;

  try {
    const data = await api.updateApiToken(body);
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
| **accountId** | `string` | The id of the service account associated with the API token | [Defaults to `undefined`] |
| **tokenId** | `string` | The id of the API token to update | [Defaults to `undefined`] |
| **apiTokenUpdateRequest** | [ApiTokenUpdateRequest](ApiTokenUpdateRequest.md) |  | |
| **expand** | `boolean` | Whether to expand resources referenced in the response to include additional fields | [Optional] [Defaults to `undefined`] |

### Return type

[**ApiTokenResource**](ApiTokenResource.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | API token updated successfully |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **404** | Resource not found |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## updateServiceAccount

> ServiceAccountResource updateServiceAccount(accountId, serviceAccountUpdateRequest, expand)

Update a service account

### Example

```ts
import {
  Configuration,
  ServiceAccountsApi,
} from '';
import type { UpdateServiceAccountRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ServiceAccountsApi(config);

  const body = {
    // string | The id of the service account to update
    accountId: 1,
    // ServiceAccountUpdateRequest
    serviceAccountUpdateRequest: ...,
    // boolean | Whether to expand resources referenced in the response to include additional fields (optional)
    expand: true,
  } satisfies UpdateServiceAccountRequest;

  try {
    const data = await api.updateServiceAccount(body);
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
| **accountId** | `string` | The id of the service account to update | [Defaults to `undefined`] |
| **serviceAccountUpdateRequest** | [ServiceAccountUpdateRequest](ServiceAccountUpdateRequest.md) |  | |
| **expand** | `boolean` | Whether to expand resources referenced in the response to include additional fields | [Optional] [Defaults to `undefined`] |

### Return type

[**ServiceAccountResource**](ServiceAccountResource.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Service account updated successfully |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **404** | Resource not found |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

