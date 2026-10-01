# DatasetLegacyApi

All URIs are relative to *https://OBSERVE_CUSTOMERID.observeinc.com*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**getDatasetById**](DatasetLegacyApi.md#getdatasetbyid) | **GET** /v1/dataset/{id} | Get a dataset (legacy) |
| [**listDatasets**](DatasetLegacyApi.md#listdatasets) | **GET** /v1/dataset | List datasets (legacy) |



## getDatasetById

> GetDatasetById200Response getDatasetById(id)

Get a dataset (legacy)

Get information about one dataset by id. Does not query the data inside the dataset. 

### Example

```ts
import {
  Configuration,
  DatasetLegacyApi,
} from '';
import type { GetDatasetByIdRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new DatasetLegacyApi(config);

  const body = {
    // string | The dataset id. Can be an ORN or a plain ID.
    id: 40000068,
  } satisfies GetDatasetByIdRequest;

  try {
    const data = await api.getDatasetById(body);
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
| **id** | `string` | The dataset id. Can be an ORN or a plain ID. | [Defaults to `undefined`] |

### Return type

[**GetDatasetById200Response**](GetDatasetById200Response.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | ## Properties of one dataset  Dataset properties, encoded as a JSON object.  |  -  |
| **400** | Invalid request. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listDatasets

> ListDatasetsResponse listDatasets(workspaceId, match, name, type, _interface)

List datasets (legacy)

List datasets, optionally matching:  * Name substring * Workspace ID * Dataset type * Interface binding 

### Example

```ts
import {
  Configuration,
  DatasetLegacyApi,
} from '';
import type { ListDatasetsRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new DatasetLegacyApi(config);

  const body = {
    // number | Only include datasets in this workspace. (optional)
    workspaceId: 41000011,
    // string | Alphanumeric fuzzy match the name of the dataset. (optional)
    match: logs,
    // string | exact name of the dataset to match (optional)
    name: kubernetes/Container Logs,
    // string | Only include datasets of this type. (optional)
    type: Event,
    // string | Only include datasets that implement this interface. (optional)
    _interface: metric,
  } satisfies ListDatasetsRequest;

  try {
    const data = await api.listDatasets(body);
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
| **workspaceId** | `number` | Only include datasets in this workspace. | [Optional] [Defaults to `undefined`] |
| **match** | `string` | Alphanumeric fuzzy match the name of the dataset. | [Optional] [Defaults to `undefined`] |
| **name** | `string` | exact name of the dataset to match | [Optional] [Defaults to `undefined`] |
| **type** | `string` | Only include datasets of this type. | [Optional] [Defaults to `undefined`] |
| **_interface** | `string` | Only include datasets that implement this interface. | [Optional] [Defaults to `undefined`] |

### Return type

[**ListDatasetsResponse**](ListDatasetsResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | ## A list of datasets The list is a JSON array of objects, each object representing a dataset.  |  -  |
| **400** | Invalid request. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

