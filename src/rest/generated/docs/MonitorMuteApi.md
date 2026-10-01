# MonitorMuteApi

All URIs are relative to *https://OBSERVE_CUSTOMERID.observeinc.com*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**createMonitorMute**](MonitorMuteApi.md#createmonitormute) | **POST** /v1/monitor-mutes | Create a monitor mute |
| [**deleteMonitorMute**](MonitorMuteApi.md#deletemonitormute) | **DELETE** /v1/monitor-mutes/{id} | Delete a monitor mute |
| [**getMonitorMute**](MonitorMuteApi.md#getmonitormute) | **GET** /v1/monitor-mutes/{id} | Get a monitor mute |
| [**listMonitorMutes**](MonitorMuteApi.md#listmonitormutes) | **GET** /v1/monitor-mutes | List monitor mutes |
| [**updateMonitorMute**](MonitorMuteApi.md#updatemonitormute) | **PATCH** /v1/monitor-mutes/{id} | Update a monitor mute |



## createMonitorMute

> MonitorMuteResource createMonitorMute(monitorMuteCreateRequest)

Create a monitor mute

### Example

```ts
import {
  Configuration,
  MonitorMuteApi,
} from '';
import type { CreateMonitorMuteRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new MonitorMuteApi(config);

  const body = {
    // MonitorMuteCreateRequest
    monitorMuteCreateRequest: ...,
  } satisfies CreateMonitorMuteRequest;

  try {
    const data = await api.createMonitorMute(body);
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
| **monitorMuteCreateRequest** | [MonitorMuteCreateRequest](MonitorMuteCreateRequest.md) |  | |

### Return type

[**MonitorMuteResource**](MonitorMuteResource.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **201** | Monitor mute created successfully |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## deleteMonitorMute

> deleteMonitorMute(id)

Delete a monitor mute

### Example

```ts
import {
  Configuration,
  MonitorMuteApi,
} from '';
import type { DeleteMonitorMuteRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new MonitorMuteApi(config);

  const body = {
    // string | The ID of the monitor mute to delete.
    id: 1,
  } satisfies DeleteMonitorMuteRequest;

  try {
    const data = await api.deleteMonitorMute(body);
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
| **id** | `string` | The ID of the monitor mute to delete. | [Defaults to `undefined`] |

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
| **204** | Monitor mute deleted successfully |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **404** | Resource not found |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getMonitorMute

> MonitorMuteResource getMonitorMute(id, expand)

Get a monitor mute

Retrieve a specific monitor mute rule by ID.

### Example

```ts
import {
  Configuration,
  MonitorMuteApi,
} from '';
import type { GetMonitorMuteRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new MonitorMuteApi(config);

  const body = {
    // string | The ID of the monitor mute to retrieve.
    id: 1,
    // boolean | When `true`, expands all referenced objects in the response: populates `record` on each `MonitorRef` in `target.monitors` with brief monitor metadata, and populates `label`, `timezone`, and `locale` on `createdBy` and `updatedBy`. `record` is omitted for any target monitor the caller is not authorized to read; its `id` is still returned, since the target id set is part of the rule\'s own configuration.  (optional)
    expand: true,
  } satisfies GetMonitorMuteRequest;

  try {
    const data = await api.getMonitorMute(body);
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
| **id** | `string` | The ID of the monitor mute to retrieve. | [Defaults to `undefined`] |
| **expand** | `boolean` | When &#x60;true&#x60;, expands all referenced objects in the response: populates &#x60;record&#x60; on each &#x60;MonitorRef&#x60; in &#x60;target.monitors&#x60; with brief monitor metadata, and populates &#x60;label&#x60;, &#x60;timezone&#x60;, and &#x60;locale&#x60; on &#x60;createdBy&#x60; and &#x60;updatedBy&#x60;. &#x60;record&#x60; is omitted for any target monitor the caller is not authorized to read; its &#x60;id&#x60; is still returned, since the target id set is part of the rule\&#39;s own configuration.  | [Optional] [Defaults to `undefined`] |

### Return type

[**MonitorMuteResource**](MonitorMuteResource.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Monitor mute retrieved successfully |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **404** | Resource not found |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listMonitorMutes

> MonitorMuteListResponse listMonitorMutes(filter, expand, limit, offset, orderBy)

List monitor mutes

Returns a paginated list of monitor mute rules, optionally filtered by a CEL expression.

### Example

```ts
import {
  Configuration,
  MonitorMuteApi,
} from '';
import type { ListMonitorMutesRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new MonitorMuteApi(config);

  const body = {
    // string | CEL expression to filter results over mute rule fields (`label`, `target.kind`, `target.monitors.id`, `createdBy.id`). Supports `matches()` for regex. Example: `target.kind == \"Monitors\"`.  (optional)
    filter: filter_example,
    // boolean | When `true`, expands all referenced objects in the response: populates `record` on each `MonitorRef` in `target.monitors` with brief monitor metadata, and populates `label`, `timezone`, and `locale` on `createdBy` and `updatedBy`. `record` is omitted for any target monitor the caller is not authorized to read; its `id` is still returned, since the target id set is part of the rule\'s own configuration.  (optional)
    expand: true,
    // number | Maximum number of results to return. Defaults to 200, max 1000. (optional)
    limit: 789,
    // number | Number of results to skip for pagination. Defaults to 0. (optional)
    offset: 789,
    // string | Comma-separated fields to order by. Prefix with `-` for descending. Defaults to `id`. Example: `orderBy=createdAt,-label`.  (optional)
    orderBy: orderBy_example,
  } satisfies ListMonitorMutesRequest;

  try {
    const data = await api.listMonitorMutes(body);
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
| **filter** | `string` | CEL expression to filter results over mute rule fields (&#x60;label&#x60;, &#x60;target.kind&#x60;, &#x60;target.monitors.id&#x60;, &#x60;createdBy.id&#x60;). Supports &#x60;matches()&#x60; for regex. Example: &#x60;target.kind &#x3D;&#x3D; \&quot;Monitors\&quot;&#x60;.  | [Optional] [Defaults to `undefined`] |
| **expand** | `boolean` | When &#x60;true&#x60;, expands all referenced objects in the response: populates &#x60;record&#x60; on each &#x60;MonitorRef&#x60; in &#x60;target.monitors&#x60; with brief monitor metadata, and populates &#x60;label&#x60;, &#x60;timezone&#x60;, and &#x60;locale&#x60; on &#x60;createdBy&#x60; and &#x60;updatedBy&#x60;. &#x60;record&#x60; is omitted for any target monitor the caller is not authorized to read; its &#x60;id&#x60; is still returned, since the target id set is part of the rule\&#39;s own configuration.  | [Optional] [Defaults to `undefined`] |
| **limit** | `number` | Maximum number of results to return. Defaults to 200, max 1000. | [Optional] [Defaults to `200`] |
| **offset** | `number` | Number of results to skip for pagination. Defaults to 0. | [Optional] [Defaults to `0`] |
| **orderBy** | `string` | Comma-separated fields to order by. Prefix with &#x60;-&#x60; for descending. Defaults to &#x60;id&#x60;. Example: &#x60;orderBy&#x3D;createdAt,-label&#x60;.  | [Optional] [Defaults to `undefined`] |

### Return type

[**MonitorMuteListResponse**](MonitorMuteListResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Monitor mutes listed successfully |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## updateMonitorMute

> MonitorMuteResource updateMonitorMute(id, monitorMuteUpdateRequest)

Update a monitor mute

Partially updates a monitor mute rule using JSON Merge Patch semantics. Only provided fields are updated; omitted fields remain unchanged. &#x60;target.kind&#x60; is immutable after creation; sending a &#x60;target&#x60; object replaces the entire target subtree atomically. 

### Example

```ts
import {
  Configuration,
  MonitorMuteApi,
} from '';
import type { UpdateMonitorMuteRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new MonitorMuteApi(config);

  const body = {
    // string | The ID of the monitor mute to update.
    id: 1,
    // MonitorMuteUpdateRequest
    monitorMuteUpdateRequest: ...,
  } satisfies UpdateMonitorMuteRequest;

  try {
    const data = await api.updateMonitorMute(body);
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
| **id** | `string` | The ID of the monitor mute to update. | [Defaults to `undefined`] |
| **monitorMuteUpdateRequest** | [MonitorMuteUpdateRequest](MonitorMuteUpdateRequest.md) |  | |

### Return type

[**MonitorMuteResource**](MonitorMuteResource.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Monitor mute updated successfully |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **404** | Resource not found |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

