# DropFiltersApi

All URIs are relative to *https://OBSERVE_CUSTOMERID.observeinc.com*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**createIngestFilter**](DropFiltersApi.md#createingestfilter) | **POST** /v1/ingest/filters | Create a drop filter |
| [**deleteIngestFilter**](DropFiltersApi.md#deleteingestfilter) | **DELETE** /v1/ingest/filters/{id} | Delete a drop filter |
| [**getIngestFilter**](DropFiltersApi.md#getingestfilter) | **GET** /v1/ingest/filters/{id} | Get a drop filter |
| [**listFilterableDatasets**](DropFiltersApi.md#listfilterabledatasets) | **GET** /v1/ingest/filters/filterable-datasets | List datasets eligible for drop filtering |
| [**listIngestFilters**](DropFiltersApi.md#listingestfilters) | **GET** /v1/ingest/filters | List drop filters |
| [**updateIngestFilter**](DropFiltersApi.md#updateingestfilter) | **PATCH** /v1/ingest/filters/{id} | Update a drop filter |
| [**validateIngestFilterExpression**](DropFiltersApi.md#validateingestfilterexpression) | **POST** /v1/ingest/filters/validate | Validate a drop filter expression |



## createIngestFilter

> IngestFiltersResource createIngestFilter(ingestFiltersCreateRequest)

Create a drop filter

Creates a drop filter. The OPAL pipeline is compiled against the source dataset\&#39;s schema; if compilation fails the request is rejected with a 400 whose error body details the compiler errors.  A dataset accepts at most 100 drop filters. Creating the 101st returns a 400. Use &#x60;POST /v1/ingest/filters/validate&#x60; to check a pipeline before creating the filter.  Allow 1-2 minutes for a new filter to take effect on the ingest path. 

### Example

```ts
import {
  Configuration,
  DropFiltersApi,
} from '';
import type { CreateIngestFilterRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new DropFiltersApi(config);

  const body = {
    // IngestFiltersCreateRequest
    ingestFiltersCreateRequest: ...,
  } satisfies CreateIngestFilterRequest;

  try {
    const data = await api.createIngestFilter(body);
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
| **ingestFiltersCreateRequest** | [IngestFiltersCreateRequest](IngestFiltersCreateRequest.md) |  | |

### Return type

[**IngestFiltersResource**](IngestFiltersResource.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **201** | Drop filter created successfully |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## deleteIngestFilter

> deleteIngestFilter(id)

Delete a drop filter

Delete a drop filter. Filters with a non-null &#x60;managedBy&#x60; are owned by an app or other managing object and cannot be deleted through this endpoint. 

### Example

```ts
import {
  Configuration,
  DropFiltersApi,
} from '';
import type { DeleteIngestFilterRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new DropFiltersApi(config);

  const body = {
    // string | The ID of the drop filter.
    id: 41030001,
  } satisfies DeleteIngestFilterRequest;

  try {
    const data = await api.deleteIngestFilter(body);
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
| **id** | `string` | The ID of the drop filter. | [Defaults to `undefined`] |

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
| **204** | Drop filter deleted successfully |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **404** | Resource not found |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getIngestFilter

> IngestFiltersResource getIngestFilter(id, expand)

Get a drop filter

Get a drop filter by its ID.

### Example

```ts
import {
  Configuration,
  DropFiltersApi,
} from '';
import type { GetIngestFilterRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new DropFiltersApi(config);

  const body = {
    // string | The ID of the drop filter.
    id: 41030001,
    // boolean | Whether to expand resources referenced in the response to include additional fields (optional)
    expand: true,
  } satisfies GetIngestFilterRequest;

  try {
    const data = await api.getIngestFilter(body);
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
| **id** | `string` | The ID of the drop filter. | [Defaults to `undefined`] |
| **expand** | `boolean` | Whether to expand resources referenced in the response to include additional fields | [Optional] [Defaults to `undefined`] |

### Return type

[**IngestFiltersResource**](IngestFiltersResource.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Drop filter queried successfully |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **404** | Resource not found |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listFilterableDatasets

> IngestFiltersFilterableDatasetsResponse listFilterableDatasets(expand, offset, limit)

List datasets eligible for drop filtering

Returns the source datasets eligible to have drop filters attached. A dataset becomes ineligible once it reaches the per-dataset cap of 100 drop filters.

### Example

```ts
import {
  Configuration,
  DropFiltersApi,
} from '';
import type { ListFilterableDatasetsRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new DropFiltersApi(config);

  const body = {
    // boolean | Whether to expand resources referenced in the response to include additional fields (optional)
    expand: true,
    // number | Number of items to skip before starting to collect the result set. (optional)
    offset: 789,
    // number | Maximum number of items to return in the response. (optional)
    limit: 789,
  } satisfies ListFilterableDatasetsRequest;

  try {
    const data = await api.listFilterableDatasets(body);
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
| **offset** | `number` | Number of items to skip before starting to collect the result set. | [Optional] [Defaults to `0`] |
| **limit** | `number` | Maximum number of items to return in the response. | [Optional] [Defaults to `100`] |

### Return type

[**IngestFiltersFilterableDatasetsResponse**](IngestFiltersFilterableDatasetsResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Filterable datasets queried successfully |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listIngestFilters

> IngestFiltersListResponse listIngestFilters(expand, offset, limit, orderBy, filter)

List drop filters

List drop filters for the calling customer. Default ordering is by &#x60;id&#x60; ascending. Pagination is offset/limit with &#x60;limit&#x60; defaulting to 100 and capped at 1000. The &#x60;expand&#x60; flag will populate the brief record on the &#x60;sourceDataset&#x60; and &#x60;managedBy&#x60; references.

### Example

```ts
import {
  Configuration,
  DropFiltersApi,
} from '';
import type { ListIngestFiltersRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new DropFiltersApi(config);

  const body = {
    // boolean | Whether to expand resources referenced in the response to include additional fields (optional)
    expand: true,
    // number | Number of items to skip before starting to collect the result set. (optional)
    offset: 789,
    // number | Maximum number of items to return in the response. (optional)
    limit: 789,
    // string | Comma-separated list of fields to order results by. Prefix a field with `-` for descending. Default ordering is by `id`. Supported fields: `id`, `label`, `enabled`, `dropRate`, `sourceDataset.id`.  (optional)
    orderBy: orderBy_example,
    // string | CEL expression that response drop filters must match. Must evaluate to `bool`. Must be URL-encoded. Supported fields: `id` (int), `label` (string), `sourceDataset.id` (int), `enabled` (bool).  (optional)
    filter: label == "my-filter",
  } satisfies ListIngestFiltersRequest;

  try {
    const data = await api.listIngestFilters(body);
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
| **offset** | `number` | Number of items to skip before starting to collect the result set. | [Optional] [Defaults to `0`] |
| **limit** | `number` | Maximum number of items to return in the response. | [Optional] [Defaults to `100`] |
| **orderBy** | `string` | Comma-separated list of fields to order results by. Prefix a field with &#x60;-&#x60; for descending. Default ordering is by &#x60;id&#x60;. Supported fields: &#x60;id&#x60;, &#x60;label&#x60;, &#x60;enabled&#x60;, &#x60;dropRate&#x60;, &#x60;sourceDataset.id&#x60;.  | [Optional] [Defaults to `undefined`] |
| **filter** | `string` | CEL expression that response drop filters must match. Must evaluate to &#x60;bool&#x60;. Must be URL-encoded. Supported fields: &#x60;id&#x60; (int), &#x60;label&#x60; (string), &#x60;sourceDataset.id&#x60; (int), &#x60;enabled&#x60; (bool).  | [Optional] [Defaults to `undefined`] |

### Return type

[**IngestFiltersListResponse**](IngestFiltersListResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Drop filters queried successfully |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## updateIngestFilter

> IngestFiltersResource updateIngestFilter(id, ingestFiltersUpdateRequest)

Update a drop filter

Merge-patch update of a drop filter. Only fields explicitly present in the body are changed; the source dataset cannot be changed. To toggle the filter, send &#x60;{\&quot;enabled\&quot;: true}&#x60; or &#x60;{\&quot;enabled\&quot;: false}&#x60;. If the OPAL pipeline is provided and fails to compile, the request is rejected with a 400. Filters with a non-null &#x60;managedBy&#x60; are owned by an app or other managing object and cannot be updated through this endpoint. Allow 1-2 minutes for the change to take effect on the ingest path.

### Example

```ts
import {
  Configuration,
  DropFiltersApi,
} from '';
import type { UpdateIngestFilterRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new DropFiltersApi(config);

  const body = {
    // string | The ID of the drop filter.
    id: 41030001,
    // IngestFiltersUpdateRequest
    ingestFiltersUpdateRequest: ...,
  } satisfies UpdateIngestFilterRequest;

  try {
    const data = await api.updateIngestFilter(body);
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
| **id** | `string` | The ID of the drop filter. | [Defaults to `undefined`] |
| **ingestFiltersUpdateRequest** | [IngestFiltersUpdateRequest](IngestFiltersUpdateRequest.md) |  | |

### Return type

[**IngestFiltersResource**](IngestFiltersResource.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Drop filter updated successfully |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **404** | Resource not found |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## validateIngestFilterExpression

> IngestFiltersValidateResponse validateIngestFilterExpression(ingestFiltersValidateRequest)

Validate a drop filter expression

Compile the given OPAL pipeline against the source dataset\&#39;s schema without persisting anything. Always returns 200 if the request body is well-formed; the response &#x60;errors&#x60; array is empty when the pipeline is valid and populated when compilation failed.

### Example

```ts
import {
  Configuration,
  DropFiltersApi,
} from '';
import type { ValidateIngestFilterExpressionRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new DropFiltersApi(config);

  const body = {
    // IngestFiltersValidateRequest
    ingestFiltersValidateRequest: ...,
  } satisfies ValidateIngestFilterExpressionRequest;

  try {
    const data = await api.validateIngestFilterExpression(body);
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
| **ingestFiltersValidateRequest** | [IngestFiltersValidateRequest](IngestFiltersValidateRequest.md) |  | |

### Return type

[**IngestFiltersValidateResponse**](IngestFiltersValidateResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Validation completed (may include compiler errors) |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

