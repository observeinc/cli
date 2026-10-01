# ReferenceTablesApi

All URIs are relative to *https://OBSERVE_CUSTOMERID.observeinc.com*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**createReferenceTable**](ReferenceTablesApi.md#createreferencetable) | **POST** /v1/referencetables | Create a new reference table |
| [**deleteReferenceTable**](ReferenceTablesApi.md#deletereferencetable) | **DELETE** /v1/referencetables/{id} | Delete a reference table |
| [**getReferenceTable**](ReferenceTablesApi.md#getreferencetable) | **GET** /v1/referencetables/{id} | Get a reference table |
| [**queryReferenceTables**](ReferenceTablesApi.md#queryreferencetables) | **GET** /v1/referencetables | Query reference tables |
| [**updateReferenceTable**](ReferenceTablesApi.md#updatereferencetable) | **PUT** /v1/referencetables/{id} | Replace a reference table |
| [**updateReferenceTableMetadata**](ReferenceTablesApi.md#updatereferencetablemetadata) | **PATCH** /v1/referencetables/{id} | Update metadata of a reference table |



## createReferenceTable

> ReferenceTablesTable createReferenceTable(metadata, upload, schema)

Create a new reference table

Creates a new reference table with the specified parameters and uploaded data.

### Example

```ts
import {
  Configuration,
  ReferenceTablesApi,
} from '';
import type { CreateReferenceTableRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ReferenceTablesApi(config);

  const body = {
    // ReferenceTablesTableMetadata (optional)
    metadata: ...,
    // Blob | CSV file containing the data (optional)
    upload: BINARY_DATA_HERE,
    // Blob | JSON file specifying the schema (optional) (optional)
    schema: BINARY_DATA_HERE,
  } satisfies CreateReferenceTableRequest;

  try {
    const data = await api.createReferenceTable(body);
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
| **metadata** | [ReferenceTablesTableMetadata](ReferenceTablesTableMetadata.md) |  | [Optional] [Defaults to `undefined`] |
| **upload** | `Blob` | CSV file containing the data | [Optional] [Defaults to `undefined`] |
| **schema** | `Blob` | JSON file specifying the schema (optional) | [Optional] [Defaults to `undefined`] |

### Return type

[**ReferenceTablesTable**](ReferenceTablesTable.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: `multipart/form-data`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **201** | Successfully created reference table |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## deleteReferenceTable

> ReferenceTablesMessageResponse deleteReferenceTable(id)

Delete a reference table

Deletes a reference table with the specified ID.

### Example

```ts
import {
  Configuration,
  ReferenceTablesApi,
} from '';
import type { DeleteReferenceTableRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ReferenceTablesApi(config);

  const body = {
    // string
    id: id_example,
  } satisfies DeleteReferenceTableRequest;

  try {
    const data = await api.deleteReferenceTable(body);
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
| **id** | `string` |  | [Defaults to `undefined`] |

### Return type

[**ReferenceTablesMessageResponse**](ReferenceTablesMessageResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successfully deleted reference table |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **404** | Resource not found |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getReferenceTable

> ReferenceTablesTable getReferenceTable(id)

Get a reference table

Retrieve a specific reference table by ID.

### Example

```ts
import {
  Configuration,
  ReferenceTablesApi,
} from '';
import type { GetReferenceTableRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ReferenceTablesApi(config);

  const body = {
    // string
    id: id_example,
  } satisfies GetReferenceTableRequest;

  try {
    const data = await api.getReferenceTable(body);
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
| **id** | `string` |  | [Defaults to `undefined`] |

### Return type

[**ReferenceTablesTable**](ReferenceTablesTable.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successfully retrieved reference table |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **404** | Resource not found |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## queryReferenceTables

> QueryReferenceTables200Response queryReferenceTables(label, createdBy, limit, offset)

Query reference tables

Search for reference tables with optional filters (label, createdBy) and pagination.

### Example

```ts
import {
  Configuration,
  ReferenceTablesApi,
} from '';
import type { QueryReferenceTablesRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ReferenceTablesApi(config);

  const body = {
    // string | Name of the reference table to search for (supports substring match). (optional)
    label: label_example,
    // string | Filter by the user who created the reference tables. (optional)
    createdBy: createdBy_example,
    // number | The maximum number of items to return per page. Defaults to 100; values above 1000 are capped to 1000. (optional)
    limit: 56,
    // number | The index of the first item to return (pagination offset). Defaults to 0. (optional)
    offset: 56,
  } satisfies QueryReferenceTablesRequest;

  try {
    const data = await api.queryReferenceTables(body);
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
| **label** | `string` | Name of the reference table to search for (supports substring match). | [Optional] [Defaults to `undefined`] |
| **createdBy** | `string` | Filter by the user who created the reference tables. | [Optional] [Defaults to `undefined`] |
| **limit** | `number` | The maximum number of items to return per page. Defaults to 100; values above 1000 are capped to 1000. | [Optional] [Defaults to `100`] |
| **offset** | `number` | The index of the first item to return (pagination offset). Defaults to 0. | [Optional] [Defaults to `0`] |

### Return type

[**QueryReferenceTables200Response**](QueryReferenceTables200Response.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successfully queried reference tables |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## updateReferenceTable

> UpdateReferenceTable200Response updateReferenceTable(id, metadata, upload, schema)

Replace a reference table

Replaces a reference table with the specified ID.

### Example

```ts
import {
  Configuration,
  ReferenceTablesApi,
} from '';
import type { UpdateReferenceTableRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ReferenceTablesApi(config);

  const body = {
    // string
    id: id_example,
    // ReferenceTablesTableMetadata (optional)
    metadata: ...,
    // Blob | CSV file containing the data (optional)
    upload: BINARY_DATA_HERE,
    // Blob | JSON file specifying the schema (optional) (optional)
    schema: BINARY_DATA_HERE,
  } satisfies UpdateReferenceTableRequest;

  try {
    const data = await api.updateReferenceTable(body);
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
| **id** | `string` |  | [Defaults to `undefined`] |
| **metadata** | [ReferenceTablesTableMetadata](ReferenceTablesTableMetadata.md) |  | [Optional] [Defaults to `undefined`] |
| **upload** | `Blob` | CSV file containing the data | [Optional] [Defaults to `undefined`] |
| **schema** | `Blob` | JSON file specifying the schema (optional) | [Optional] [Defaults to `undefined`] |

### Return type

[**UpdateReferenceTable200Response**](UpdateReferenceTable200Response.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: `multipart/form-data`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successfully replaced reference table |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **404** | Resource not found |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## updateReferenceTableMetadata

> ReferenceTablesTable updateReferenceTableMetadata(id, referenceTablesTableMetadataPatch)

Update metadata of a reference table

Updates the metadata of a reference table with the specified ID.

### Example

```ts
import {
  Configuration,
  ReferenceTablesApi,
} from '';
import type { UpdateReferenceTableMetadataRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ReferenceTablesApi(config);

  const body = {
    // string
    id: id_example,
    // ReferenceTablesTableMetadataPatch
    referenceTablesTableMetadataPatch: ...,
  } satisfies UpdateReferenceTableMetadataRequest;

  try {
    const data = await api.updateReferenceTableMetadata(body);
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
| **id** | `string` |  | [Defaults to `undefined`] |
| **referenceTablesTableMetadataPatch** | [ReferenceTablesTableMetadataPatch](ReferenceTablesTableMetadataPatch.md) |  | |

### Return type

[**ReferenceTablesTable**](ReferenceTablesTable.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successfully updated reference table metadata |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **404** | Resource not found |  -  |
| **409** | Conflict |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

