# DatasetQueryFilterApi

All URIs are relative to *https://OBSERVE_CUSTOMERID.observeinc.com*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**createDatasetQueryFilter**](DatasetQueryFilterApi.md#createdatasetqueryfilter) | **POST** /v1/datasets/{datasetId}/query-filters | Create a new dataset query filter |
| [**deleteDatasetQueryFilter**](DatasetQueryFilterApi.md#deletedatasetqueryfilter) | **DELETE** /v1/datasets/{datasetId}/query-filters/{id} | Delete a dataset query filter |
| [**getDatasetQueryFilterById**](DatasetQueryFilterApi.md#getdatasetqueryfilterbyid) | **GET** /v1/datasets/{datasetId}/query-filters/{id} | Get a dataset query filter by ID |
| [**listDatasetQueryFilters**](DatasetQueryFilterApi.md#listdatasetqueryfilters) | **GET** /v1/datasets/{datasetId}/query-filters | Get a list of dataset query filters |
| [**updateDatasetQueryFilter**](DatasetQueryFilterApi.md#updatedatasetqueryfilter) | **PATCH** /v1/datasets/{datasetId}/query-filters/{id} | Update a dataset query filter |



## createDatasetQueryFilter

> DatasetQueryFilterResource createDatasetQueryFilter(datasetId, datasetQueryFilterCreateRequest, expand)

Create a new dataset query filter

Create a new query filter for a specific dataset

### Example

```ts
import {
  Configuration,
  DatasetQueryFilterApi,
} from '';
import type { CreateDatasetQueryFilterRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new DatasetQueryFilterApi(config);

  const body = {
    // string | The ID of the dataset
    datasetId: datasetId_example,
    // DatasetQueryFilterCreateRequest
    datasetQueryFilterCreateRequest: ...,
    // boolean | Whether to expand resources referenced in the response to include additional fields (optional)
    expand: true,
  } satisfies CreateDatasetQueryFilterRequest;

  try {
    const data = await api.createDatasetQueryFilter(body);
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
| **datasetId** | `string` | The ID of the dataset | [Defaults to `undefined`] |
| **datasetQueryFilterCreateRequest** | [DatasetQueryFilterCreateRequest](DatasetQueryFilterCreateRequest.md) |  | |
| **expand** | `boolean` | Whether to expand resources referenced in the response to include additional fields | [Optional] [Defaults to `undefined`] |

### Return type

[**DatasetQueryFilterResource**](DatasetQueryFilterResource.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **201** | Dataset query filter created successfully |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **404** | Resource not found |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## deleteDatasetQueryFilter

> deleteDatasetQueryFilter(datasetId, id)

Delete a dataset query filter

Delete an existing query filter

### Example

```ts
import {
  Configuration,
  DatasetQueryFilterApi,
} from '';
import type { DeleteDatasetQueryFilterRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new DatasetQueryFilterApi(config);

  const body = {
    // string | The ID of the dataset
    datasetId: datasetId_example,
    // string | The ID of the query filter to delete
    id: 7890123,
  } satisfies DeleteDatasetQueryFilterRequest;

  try {
    const data = await api.deleteDatasetQueryFilter(body);
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
| **datasetId** | `string` | The ID of the dataset | [Defaults to `undefined`] |
| **id** | `string` | The ID of the query filter to delete | [Defaults to `undefined`] |

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
| **204** | Dataset query filter deleted successfully |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **404** | Resource not found |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getDatasetQueryFilterById

> DatasetQueryFilterResource getDatasetQueryFilterById(datasetId, id, expand)

Get a dataset query filter by ID

Retrieve a specific query filter by its ID

### Example

```ts
import {
  Configuration,
  DatasetQueryFilterApi,
} from '';
import type { GetDatasetQueryFilterByIdRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new DatasetQueryFilterApi(config);

  const body = {
    // string | The ID of the dataset
    datasetId: datasetId_example,
    // string | The ID of the query filter to retrieve
    id: 7890123,
    // boolean | Whether to expand resources referenced in the response to include additional fields (optional)
    expand: true,
  } satisfies GetDatasetQueryFilterByIdRequest;

  try {
    const data = await api.getDatasetQueryFilterById(body);
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
| **datasetId** | `string` | The ID of the dataset | [Defaults to `undefined`] |
| **id** | `string` | The ID of the query filter to retrieve | [Defaults to `undefined`] |
| **expand** | `boolean` | Whether to expand resources referenced in the response to include additional fields | [Optional] [Defaults to `undefined`] |

### Return type

[**DatasetQueryFilterResource**](DatasetQueryFilterResource.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Dataset query filter retrieved successfully |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **404** | Resource not found |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listDatasetQueryFilters

> ListDatasetQueryFilters200Response listDatasetQueryFilters(datasetId, limit, offset, expand)

Get a list of dataset query filters

Get a list of all query filters for a specific dataset

### Example

```ts
import {
  Configuration,
  DatasetQueryFilterApi,
} from '';
import type { ListDatasetQueryFiltersRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new DatasetQueryFilterApi(config);

  const body = {
    // string | The ID of the dataset
    datasetId: datasetId_example,
    // number | Maximum number of items to return in the response (optional)
    limit: 789,
    // number | Number of items to skip before starting to collect the result set (optional)
    offset: 789,
    // boolean | Whether to expand resources referenced in the response to include additional fields (optional)
    expand: true,
  } satisfies ListDatasetQueryFiltersRequest;

  try {
    const data = await api.listDatasetQueryFilters(body);
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
| **datasetId** | `string` | The ID of the dataset | [Defaults to `undefined`] |
| **limit** | `number` | Maximum number of items to return in the response | [Optional] [Defaults to `undefined`] |
| **offset** | `number` | Number of items to skip before starting to collect the result set | [Optional] [Defaults to `undefined`] |
| **expand** | `boolean` | Whether to expand resources referenced in the response to include additional fields | [Optional] [Defaults to `undefined`] |

### Return type

[**ListDatasetQueryFilters200Response**](ListDatasetQueryFilters200Response.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Dataset query filters retrieved successfully |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **404** | Resource not found |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## updateDatasetQueryFilter

> DatasetQueryFilterResource updateDatasetQueryFilter(datasetId, id, datasetQueryFilterUpdateRequest, expand)

Update a dataset query filter

Update an existing query filter using JSON Merge Patch semantics

### Example

```ts
import {
  Configuration,
  DatasetQueryFilterApi,
} from '';
import type { UpdateDatasetQueryFilterRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new DatasetQueryFilterApi(config);

  const body = {
    // string | The ID of the dataset
    datasetId: datasetId_example,
    // string | The ID of the query filter to update
    id: 7890123,
    // DatasetQueryFilterUpdateRequest
    datasetQueryFilterUpdateRequest: ...,
    // boolean | Whether to expand resources referenced in the response to include additional fields (optional)
    expand: true,
  } satisfies UpdateDatasetQueryFilterRequest;

  try {
    const data = await api.updateDatasetQueryFilter(body);
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
| **datasetId** | `string` | The ID of the dataset | [Defaults to `undefined`] |
| **id** | `string` | The ID of the query filter to update | [Defaults to `undefined`] |
| **datasetQueryFilterUpdateRequest** | [DatasetQueryFilterUpdateRequest](DatasetQueryFilterUpdateRequest.md) |  | |
| **expand** | `boolean` | Whether to expand resources referenced in the response to include additional fields | [Optional] [Defaults to `undefined`] |

### Return type

[**DatasetQueryFilterResource**](DatasetQueryFilterResource.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Dataset query filter updated successfully |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **404** | Resource not found |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

