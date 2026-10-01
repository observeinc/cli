# IngestRoutesApi

All URIs are relative to *https://OBSERVE_CUSTOMERID.observeinc.com*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**createIngestRoute**](IngestRoutesApi.md#createingestroute) | **POST** /v1/ingest/routes/{type} | Create an ingest route. |
| [**deleteIngestRoute**](IngestRoutesApi.md#deleteingestroute) | **DELETE** /v1/ingest/routes/{type}/{id} | Delete an ingest route |
| [**getIngestRoute**](IngestRoutesApi.md#getingestroute) | **GET** /v1/ingest/routes/{type}/{id} | Get an ingest route |
| [**listIngestRoutes**](IngestRoutesApi.md#listingestroutes) | **GET** /v1/ingest/routes/{type} | List ingest routes |
| [**updateIngestRoute**](IngestRoutesApi.md#updateingestroute) | **PATCH** /v1/ingest/routes/{type}/{id} | Update an ingest route |
| [**updateIngestRoutePriorities**](IngestRoutesApi.md#updateingestroutepriorities) | **PATCH** /v1/ingest/routes/{type} | Update ingest route priorities |



## createIngestRoute

> IngestRoutesResource createIngestRoute(type, ingestRoutesCreateRequest)

Create an ingest route.

&gt; **Beta — schema may still change; breaking changes are coordinated with affected customers. Suitable for evaluation, not production reliance.**  Creates an ingest route. The destination ID must be the ID of a source dataset whose type matches the &#x60;type&#x60; path parameter. Returns the created route. 

### Example

```ts
import {
  Configuration,
  IngestRoutesApi,
} from '';
import type { CreateIngestRouteRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new IngestRoutesApi(config);

  const body = {
    // IngestRoutesType | The type of the ingest route to query. These types correspond to the various source dataset schemas supported by Observe. `any` refers to the \"default\" generic source dataset schema with the `FIELDS` and `EXTRA` columns. All of the others correspond to direct-write source datasets. Each type is also associated with particular ingest HTTP endpoints that emit compatible data for that type. Incoming data on a given endpoint is routable to any dataset of the corresponding type.  The following [type -> ingest path] mappings are defined:  - `otellogs` <-> `/v1/otel/v1/logs` - `otelmetrics` <-> `/v1/otel/v1/metrics` - `oteltraces` <-> `/v1/otel/v1/traces` - `prometheus` <-> `/v1/prometheus` - `k8sentity` <-> `/v1/kubernetes` - `any` <-> `/v1/_*` 
    type: otellogs,
    // IngestRoutesCreateRequest
    ingestRoutesCreateRequest: ...,
  } satisfies CreateIngestRouteRequest;

  try {
    const data = await api.createIngestRoute(body);
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
| **type** | `IngestRoutesType` | The type of the ingest route to query. These types correspond to the various source dataset schemas supported by Observe. &#x60;any&#x60; refers to the \&quot;default\&quot; generic source dataset schema with the &#x60;FIELDS&#x60; and &#x60;EXTRA&#x60; columns. All of the others correspond to direct-write source datasets. Each type is also associated with particular ingest HTTP endpoints that emit compatible data for that type. Incoming data on a given endpoint is routable to any dataset of the corresponding type.  The following [type -&gt; ingest path] mappings are defined:  - &#x60;otellogs&#x60; &lt;-&gt; &#x60;/v1/otel/v1/logs&#x60; - &#x60;otelmetrics&#x60; &lt;-&gt; &#x60;/v1/otel/v1/metrics&#x60; - &#x60;oteltraces&#x60; &lt;-&gt; &#x60;/v1/otel/v1/traces&#x60; - &#x60;prometheus&#x60; &lt;-&gt; &#x60;/v1/prometheus&#x60; - &#x60;k8sentity&#x60; &lt;-&gt; &#x60;/v1/kubernetes&#x60; - &#x60;any&#x60; &lt;-&gt; &#x60;/v1/_*&#x60;  | [Defaults to `undefined`] [Enum: otellogs, otelmetrics, oteltraces, prometheus, k8sentity, any] |
| **ingestRoutesCreateRequest** | [IngestRoutesCreateRequest](IngestRoutesCreateRequest.md) |  | |

### Return type

[**IngestRoutesResource**](IngestRoutesResource.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **201** | Ingest route created successfully |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## deleteIngestRoute

> deleteIngestRoute(type, id)

Delete an ingest route

&gt; **Beta — schema may still change; breaking changes are coordinated with affected customers. Suitable for evaluation, not production reliance.**  Delete an ingest route. The default route for a type cannot be deleted. 

### Example

```ts
import {
  Configuration,
  IngestRoutesApi,
} from '';
import type { DeleteIngestRouteRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new IngestRoutesApi(config);

  const body = {
    // IngestRoutesType | The type of the ingest route to query. These types correspond to the various source dataset schemas supported by Observe. `any` refers to the \"default\" generic source dataset schema with the `FIELDS` and `EXTRA` columns. All of the others correspond to direct-write source datasets. Each type is also associated with particular ingest HTTP endpoints that emit compatible data for that type. Incoming data on a given endpoint is routable to any dataset of the corresponding type.  The following [type -> ingest path] mappings are defined:  - `otellogs` <-> `/v1/otel/v1/logs` - `otelmetrics` <-> `/v1/otel/v1/metrics` - `oteltraces` <-> `/v1/otel/v1/traces` - `prometheus` <-> `/v1/prometheus` - `k8sentity` <-> `/v1/kubernetes` - `any` <-> `/v1/_*` 
    type: otellogs,
    // string | The id of the ingest route
    id: 1,
  } satisfies DeleteIngestRouteRequest;

  try {
    const data = await api.deleteIngestRoute(body);
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
| **type** | `IngestRoutesType` | The type of the ingest route to query. These types correspond to the various source dataset schemas supported by Observe. &#x60;any&#x60; refers to the \&quot;default\&quot; generic source dataset schema with the &#x60;FIELDS&#x60; and &#x60;EXTRA&#x60; columns. All of the others correspond to direct-write source datasets. Each type is also associated with particular ingest HTTP endpoints that emit compatible data for that type. Incoming data on a given endpoint is routable to any dataset of the corresponding type.  The following [type -&gt; ingest path] mappings are defined:  - &#x60;otellogs&#x60; &lt;-&gt; &#x60;/v1/otel/v1/logs&#x60; - &#x60;otelmetrics&#x60; &lt;-&gt; &#x60;/v1/otel/v1/metrics&#x60; - &#x60;oteltraces&#x60; &lt;-&gt; &#x60;/v1/otel/v1/traces&#x60; - &#x60;prometheus&#x60; &lt;-&gt; &#x60;/v1/prometheus&#x60; - &#x60;k8sentity&#x60; &lt;-&gt; &#x60;/v1/kubernetes&#x60; - &#x60;any&#x60; &lt;-&gt; &#x60;/v1/_*&#x60;  | [Defaults to `undefined`] [Enum: otellogs, otelmetrics, oteltraces, prometheus, k8sentity, any] |
| **id** | `string` | The id of the ingest route | [Defaults to `undefined`] |

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
| **204** | Ingest route deleted successfully |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **404** | Resource not found |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getIngestRoute

> IngestRoutesResource getIngestRoute(type, id, expand)

Get an ingest route

&gt; **Beta — schema may still change; breaking changes are coordinated with affected customers. Suitable for evaluation, not production reliance.**  Get a single ingest route by its ID. 

### Example

```ts
import {
  Configuration,
  IngestRoutesApi,
} from '';
import type { GetIngestRouteRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new IngestRoutesApi(config);

  const body = {
    // IngestRoutesType | The type of the ingest route to query. These types correspond to the various source dataset schemas supported by Observe. `any` refers to the \"default\" generic source dataset schema with the `FIELDS` and `EXTRA` columns. All of the others correspond to direct-write source datasets. Each type is also associated with particular ingest HTTP endpoints that emit compatible data for that type. Incoming data on a given endpoint is routable to any dataset of the corresponding type.  The following [type -> ingest path] mappings are defined:  - `otellogs` <-> `/v1/otel/v1/logs` - `otelmetrics` <-> `/v1/otel/v1/metrics` - `oteltraces` <-> `/v1/otel/v1/traces` - `prometheus` <-> `/v1/prometheus` - `k8sentity` <-> `/v1/kubernetes` - `any` <-> `/v1/_*` 
    type: otellogs,
    // string | The id of the ingest route
    id: 1,
    // boolean | Whether to expand resources referenced in the response to include additional fields (optional)
    expand: true,
  } satisfies GetIngestRouteRequest;

  try {
    const data = await api.getIngestRoute(body);
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
| **type** | `IngestRoutesType` | The type of the ingest route to query. These types correspond to the various source dataset schemas supported by Observe. &#x60;any&#x60; refers to the \&quot;default\&quot; generic source dataset schema with the &#x60;FIELDS&#x60; and &#x60;EXTRA&#x60; columns. All of the others correspond to direct-write source datasets. Each type is also associated with particular ingest HTTP endpoints that emit compatible data for that type. Incoming data on a given endpoint is routable to any dataset of the corresponding type.  The following [type -&gt; ingest path] mappings are defined:  - &#x60;otellogs&#x60; &lt;-&gt; &#x60;/v1/otel/v1/logs&#x60; - &#x60;otelmetrics&#x60; &lt;-&gt; &#x60;/v1/otel/v1/metrics&#x60; - &#x60;oteltraces&#x60; &lt;-&gt; &#x60;/v1/otel/v1/traces&#x60; - &#x60;prometheus&#x60; &lt;-&gt; &#x60;/v1/prometheus&#x60; - &#x60;k8sentity&#x60; &lt;-&gt; &#x60;/v1/kubernetes&#x60; - &#x60;any&#x60; &lt;-&gt; &#x60;/v1/_*&#x60;  | [Defaults to `undefined`] [Enum: otellogs, otelmetrics, oteltraces, prometheus, k8sentity, any] |
| **id** | `string` | The id of the ingest route | [Defaults to `undefined`] |
| **expand** | `boolean` | Whether to expand resources referenced in the response to include additional fields | [Optional] [Defaults to `undefined`] |

### Return type

[**IngestRoutesResource**](IngestRoutesResource.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Ingest route queried successfully |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **404** | Resource not found |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listIngestRoutes

> IngestRoutesListResponse listIngestRoutes(type, expand)

List ingest routes

&gt; **Beta — schema may still change; breaking changes are coordinated with affected customers. Suitable for evaluation, not production reliance.**  List ingest routes for a type. Routes are returned in priority order: the route at index 0 is matched against incoming data first, index 1 is evaluated next if the first did not match, and so on. The type\&#39;s default route is always last, and matches anything the others did not.  Disabled routes are included in the response but are skipped during matching. This endpoint is not paginated; it returns every route for the type, and &#x60;meta.totalCount&#x60; is that count. 

### Example

```ts
import {
  Configuration,
  IngestRoutesApi,
} from '';
import type { ListIngestRoutesRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new IngestRoutesApi(config);

  const body = {
    // IngestRoutesType | The type of the ingest route to query. These types correspond to the various source dataset schemas supported by Observe. `any` refers to the \"default\" generic source dataset schema with the `FIELDS` and `EXTRA` columns. All of the others correspond to direct-write source datasets. Each type is also associated with particular ingest HTTP endpoints that emit compatible data for that type. Incoming data on a given endpoint is routable to any dataset of the corresponding type.  The following [type -> ingest path] mappings are defined:  - `otellogs` <-> `/v1/otel/v1/logs` - `otelmetrics` <-> `/v1/otel/v1/metrics` - `oteltraces` <-> `/v1/otel/v1/traces` - `prometheus` <-> `/v1/prometheus` - `k8sentity` <-> `/v1/kubernetes` - `any` <-> `/v1/_*` 
    type: otellogs,
    // boolean | Whether to expand resources referenced in the response to include additional fields (optional)
    expand: true,
  } satisfies ListIngestRoutesRequest;

  try {
    const data = await api.listIngestRoutes(body);
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
| **type** | `IngestRoutesType` | The type of the ingest route to query. These types correspond to the various source dataset schemas supported by Observe. &#x60;any&#x60; refers to the \&quot;default\&quot; generic source dataset schema with the &#x60;FIELDS&#x60; and &#x60;EXTRA&#x60; columns. All of the others correspond to direct-write source datasets. Each type is also associated with particular ingest HTTP endpoints that emit compatible data for that type. Incoming data on a given endpoint is routable to any dataset of the corresponding type.  The following [type -&gt; ingest path] mappings are defined:  - &#x60;otellogs&#x60; &lt;-&gt; &#x60;/v1/otel/v1/logs&#x60; - &#x60;otelmetrics&#x60; &lt;-&gt; &#x60;/v1/otel/v1/metrics&#x60; - &#x60;oteltraces&#x60; &lt;-&gt; &#x60;/v1/otel/v1/traces&#x60; - &#x60;prometheus&#x60; &lt;-&gt; &#x60;/v1/prometheus&#x60; - &#x60;k8sentity&#x60; &lt;-&gt; &#x60;/v1/kubernetes&#x60; - &#x60;any&#x60; &lt;-&gt; &#x60;/v1/_*&#x60;  | [Defaults to `undefined`] [Enum: otellogs, otelmetrics, oteltraces, prometheus, k8sentity, any] |
| **expand** | `boolean` | Whether to expand resources referenced in the response to include additional fields | [Optional] [Defaults to `undefined`] |

### Return type

[**IngestRoutesListResponse**](IngestRoutesListResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Ingest routes queried successfully |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **404** | Resource not found |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## updateIngestRoute

> IngestRoutesResource updateIngestRoute(type, id, ingestRoutesUpdateRequest)

Update an ingest route

&gt; **Beta — schema may still change; breaking changes are coordinated with affected customers. Suitable for evaluation, not production reliance.**  Update an ingest route configuration. The destination ID must be the ID of a source dataset whose type matches the &#x60;type&#x60; path parameter.  Use &#x60;PATCH /v1/ingest/routes/{type}&#x60; to change priority order. This endpoint does not change priority. 

### Example

```ts
import {
  Configuration,
  IngestRoutesApi,
} from '';
import type { UpdateIngestRouteRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new IngestRoutesApi(config);

  const body = {
    // IngestRoutesType | The type of the ingest route to query. These types correspond to the various source dataset schemas supported by Observe. `any` refers to the \"default\" generic source dataset schema with the `FIELDS` and `EXTRA` columns. All of the others correspond to direct-write source datasets. Each type is also associated with particular ingest HTTP endpoints that emit compatible data for that type. Incoming data on a given endpoint is routable to any dataset of the corresponding type.  The following [type -> ingest path] mappings are defined:  - `otellogs` <-> `/v1/otel/v1/logs` - `otelmetrics` <-> `/v1/otel/v1/metrics` - `oteltraces` <-> `/v1/otel/v1/traces` - `prometheus` <-> `/v1/prometheus` - `k8sentity` <-> `/v1/kubernetes` - `any` <-> `/v1/_*` 
    type: otellogs,
    // string | The id of the ingest route
    id: 1,
    // IngestRoutesUpdateRequest
    ingestRoutesUpdateRequest: ...,
  } satisfies UpdateIngestRouteRequest;

  try {
    const data = await api.updateIngestRoute(body);
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
| **type** | `IngestRoutesType` | The type of the ingest route to query. These types correspond to the various source dataset schemas supported by Observe. &#x60;any&#x60; refers to the \&quot;default\&quot; generic source dataset schema with the &#x60;FIELDS&#x60; and &#x60;EXTRA&#x60; columns. All of the others correspond to direct-write source datasets. Each type is also associated with particular ingest HTTP endpoints that emit compatible data for that type. Incoming data on a given endpoint is routable to any dataset of the corresponding type.  The following [type -&gt; ingest path] mappings are defined:  - &#x60;otellogs&#x60; &lt;-&gt; &#x60;/v1/otel/v1/logs&#x60; - &#x60;otelmetrics&#x60; &lt;-&gt; &#x60;/v1/otel/v1/metrics&#x60; - &#x60;oteltraces&#x60; &lt;-&gt; &#x60;/v1/otel/v1/traces&#x60; - &#x60;prometheus&#x60; &lt;-&gt; &#x60;/v1/prometheus&#x60; - &#x60;k8sentity&#x60; &lt;-&gt; &#x60;/v1/kubernetes&#x60; - &#x60;any&#x60; &lt;-&gt; &#x60;/v1/_*&#x60;  | [Defaults to `undefined`] [Enum: otellogs, otelmetrics, oteltraces, prometheus, k8sentity, any] |
| **id** | `string` | The id of the ingest route | [Defaults to `undefined`] |
| **ingestRoutesUpdateRequest** | [IngestRoutesUpdateRequest](IngestRoutesUpdateRequest.md) |  | |

### Return type

[**IngestRoutesResource**](IngestRoutesResource.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Ingest route updated successfully |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **404** | Resource not found |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## updateIngestRoutePriorities

> IngestRoutesListResponse updateIngestRoutePriorities(type, ingestRoutesUpdatePriorityRequest)

Update ingest route priorities

&gt; **Beta — schema may still change; breaking changes are coordinated with affected customers. Suitable for evaluation, not production reliance.**  Reorder the ingest routes for a type. Send an ordered list of route IDs that sets the new priority order. The list must contain every route ID for the type, with no duplicates and no other IDs.  Returns all routes for the type in the new priority order. 

### Example

```ts
import {
  Configuration,
  IngestRoutesApi,
} from '';
import type { UpdateIngestRoutePrioritiesRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new IngestRoutesApi(config);

  const body = {
    // IngestRoutesType | The type of the ingest route to query. These types correspond to the various source dataset schemas supported by Observe. `any` refers to the \"default\" generic source dataset schema with the `FIELDS` and `EXTRA` columns. All of the others correspond to direct-write source datasets. Each type is also associated with particular ingest HTTP endpoints that emit compatible data for that type. Incoming data on a given endpoint is routable to any dataset of the corresponding type.  The following [type -> ingest path] mappings are defined:  - `otellogs` <-> `/v1/otel/v1/logs` - `otelmetrics` <-> `/v1/otel/v1/metrics` - `oteltraces` <-> `/v1/otel/v1/traces` - `prometheus` <-> `/v1/prometheus` - `k8sentity` <-> `/v1/kubernetes` - `any` <-> `/v1/_*` 
    type: otellogs,
    // IngestRoutesUpdatePriorityRequest
    ingestRoutesUpdatePriorityRequest: ...,
  } satisfies UpdateIngestRoutePrioritiesRequest;

  try {
    const data = await api.updateIngestRoutePriorities(body);
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
| **type** | `IngestRoutesType` | The type of the ingest route to query. These types correspond to the various source dataset schemas supported by Observe. &#x60;any&#x60; refers to the \&quot;default\&quot; generic source dataset schema with the &#x60;FIELDS&#x60; and &#x60;EXTRA&#x60; columns. All of the others correspond to direct-write source datasets. Each type is also associated with particular ingest HTTP endpoints that emit compatible data for that type. Incoming data on a given endpoint is routable to any dataset of the corresponding type.  The following [type -&gt; ingest path] mappings are defined:  - &#x60;otellogs&#x60; &lt;-&gt; &#x60;/v1/otel/v1/logs&#x60; - &#x60;otelmetrics&#x60; &lt;-&gt; &#x60;/v1/otel/v1/metrics&#x60; - &#x60;oteltraces&#x60; &lt;-&gt; &#x60;/v1/otel/v1/traces&#x60; - &#x60;prometheus&#x60; &lt;-&gt; &#x60;/v1/prometheus&#x60; - &#x60;k8sentity&#x60; &lt;-&gt; &#x60;/v1/kubernetes&#x60; - &#x60;any&#x60; &lt;-&gt; &#x60;/v1/_*&#x60;  | [Defaults to `undefined`] [Enum: otellogs, otelmetrics, oteltraces, prometheus, k8sentity, any] |
| **ingestRoutesUpdatePriorityRequest** | [IngestRoutesUpdatePriorityRequest](IngestRoutesUpdatePriorityRequest.md) |  | |

### Return type

[**IngestRoutesListResponse**](IngestRoutesListResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Ingest route priorities updated successfully |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **404** | Resource not found |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

