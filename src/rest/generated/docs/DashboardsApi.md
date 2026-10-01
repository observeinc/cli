# DashboardsApi

All URIs are relative to *https://OBSERVE_CUSTOMERID.observeinc.com*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**createDashboard**](DashboardsApi.md#createdashboard) | **POST** /v1/dashboards | Create a dashboard |
| [**deleteDashboard**](DashboardsApi.md#deletedashboard) | **DELETE** /v1/dashboards/{id} | Delete a dashboard |
| [**getDashboard**](DashboardsApi.md#getdashboard) | **GET** /v1/dashboards/{id} | Get a dashboard by id |
| [**listDashboards**](DashboardsApi.md#listdashboards) | **GET** /v1/dashboards | List dashboards |
| [**updateDashboard**](DashboardsApi.md#updatedashboard) | **PATCH** /v1/dashboards/{id} | Update a dashboard |



## createDashboard

> DashboardResource createDashboard(dashboardCreateRequest, expand)

Create a dashboard

&gt; **Beta — may change; breaking changes are coordinated with affected &gt; customers. Suitable for evaluation, not production reliance.**  Create a dashboard. The server assigns &#x60;id&#x60;, &#x60;createdAt&#x60;, &#x60;updatedAt&#x60;, &#x60;createdBy&#x60;, and &#x60;updatedBy&#x60;. 

### Example

```ts
import {
  Configuration,
  DashboardsApi,
} from '';
import type { CreateDashboardRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new DashboardsApi(config);

  const body = {
    // DashboardCreateRequest
    dashboardCreateRequest: ...,
    // boolean | Whether to expand resources referenced in the response to include additional fields (optional)
    expand: true,
  } satisfies CreateDashboardRequest;

  try {
    const data = await api.createDashboard(body);
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
| **dashboardCreateRequest** | [DashboardCreateRequest](DashboardCreateRequest.md) |  | |
| **expand** | `boolean` | Whether to expand resources referenced in the response to include additional fields | [Optional] [Defaults to `undefined`] |

### Return type

[**DashboardResource**](DashboardResource.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **201** | Dashboard created successfully |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **409** | Conflict |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## deleteDashboard

> deleteDashboard(id)

Delete a dashboard

&gt; **Beta — may change; breaking changes are coordinated with affected &gt; customers. Suitable for evaluation, not production reliance.**  Delete a dashboard by its id. 

### Example

```ts
import {
  Configuration,
  DashboardsApi,
} from '';
import type { DeleteDashboardRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new DashboardsApi(config);

  const body = {
    // string | Unique identifier of the dashboard (numeric id serialized as a string). 
    id: 41000001,
  } satisfies DeleteDashboardRequest;

  try {
    const data = await api.deleteDashboard(body);
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
| **id** | `string` | Unique identifier of the dashboard (numeric id serialized as a string).  | [Defaults to `undefined`] |

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
| **204** | Dashboard deleted successfully |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **404** | Resource not found |  -  |
| **422** | Unprocessable entity — a required query parameter was omitted (e.g. &#x60;missing_field&#x60;). |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getDashboard

> DashboardResource getDashboard(id, expand)

Get a dashboard by id

&gt; **Beta — may change; breaking changes are coordinated with affected &gt; customers. Suitable for evaluation, not production reliance.**  Return the full dashboard document (envelope metadata plus &#x60;definition&#x60;).  Set &#x60;expand&#x3D;true&#x60; to populate display fields on &#x60;createdBy&#x60; and &#x60;updatedBy&#x60;, and &#x60;record&#x60; on &#x60;managedBy&#x60;. Without &#x60;expand&#x60;, references contain only &#x60;id&#x60;. 

### Example

```ts
import {
  Configuration,
  DashboardsApi,
} from '';
import type { GetDashboardRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new DashboardsApi(config);

  const body = {
    // string | Unique identifier of the dashboard (numeric id serialized as a string). 
    id: 41000001,
    // boolean | Whether to expand resources referenced in the response to include additional fields (optional)
    expand: true,
  } satisfies GetDashboardRequest;

  try {
    const data = await api.getDashboard(body);
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
| **id** | `string` | Unique identifier of the dashboard (numeric id serialized as a string).  | [Defaults to `undefined`] |
| **expand** | `boolean` | Whether to expand resources referenced in the response to include additional fields | [Optional] [Defaults to `undefined`] |

### Return type

[**DashboardResource**](DashboardResource.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Dashboard found |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **404** | Resource not found |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listDashboards

> DashboardListResponse listDashboards(filter, orderBy, offset, limit, expand)

List dashboards

&gt; **Beta — may change; breaking changes are coordinated with affected &gt; customers. Suitable for evaluation, not production reliance.**  Returns a paginated list of dashboards the caller can read. List items include envelope metadata only (no &#x60;definition&#x60;). Default page size is 100; maximum is 100. Default ordering is &#x60;name&#x60; ascending, then &#x60;id&#x60; ascending.  Set &#x60;expand&#x3D;true&#x60; to populate display fields on &#x60;createdBy&#x60; and &#x60;updatedBy&#x60;, and &#x60;record&#x60; on &#x60;managedBy&#x60;. Without &#x60;expand&#x60;, references contain only &#x60;id&#x60;. 

### Example

```ts
import {
  Configuration,
  DashboardsApi,
} from '';
import type { ListDashboardsRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new DashboardsApi(config);

  const body = {
    // string | [Common Expression Language (CEL)](https://cel.dev) expression that each dashboard must match. It must evaluate to a boolean.  **Identity and content:** `id` (int in CEL, string in JSON), `name`, `description` (string), `visibility` (`Listed` or `Hidden`).  **Audit:** `createdAt`, `updatedAt` (timestamp); `createdBy.id`, `updatedBy.id` (user id, int).  **Owner reference:** `managedBy.id` (int); `managedBy.record.label`, `managedBy.record.description` (string). These are filterable even without `expand=true` — `expand` controls what is *returned*, not what can be filtered.  **Facets (filter-only, not sortable):**  | Field | CEL type | Notes | |---|---|---| | `objectTags` | `map(string, list(string))` | User-applied tags, as a map of tag key to a list of values. | | `parameters.correlationTags` | `list(string)` | Correlation-tag names picked by the dashboard\'s `correlationTag`-kind parameters. | | `parameters.resources.ids` | `list(int)` | Dataset ids picked by the dashboard\'s `resource`-kind parameters. | | `parameters.resources.names` | `list(string)` | Dataset names for the same `resource`-kind parameters. | | `queries.inputs.ids` | `list(int)` | Dataset ids bound to the dashboard\'s query-card inputs. | | `queries.inputs.names` | `list(string)` | Dataset names for the same query-card inputs. | | `datasetFilter.id` | `int`, nullable | The primary dataset filter\'s dataset id, when set. | | `datasetFilter.name` | `string`, nullable | The primary dataset filter\'s dataset name, when set. |  Supports `matches()` for regex. Example: `name.matches(\"prod.*\")`.  (optional)
    filter: filter_example,
    // string | CSV list of [CEL](https://cel.dev) expressions, each producing a comparable value. Prefix an item with `-` for descending order. Default sort is `name` ascending, then `id` ascending.  Sortable fields: `id`, `name`, `description`, `visibility`, `createdAt`, `updatedAt`, `createdBy.id`, `updatedBy.id`, `managedBy.id`. Facet fields (`objectTags`, `parameters.*`, `queries.*`, `datasetFilter.*`) cannot be sorted.  CSV-escape first, then URL-encode. Wrap an item in `\"` if it contains a comma or `\"`; double a literal `\"` to `\"\"` inside a quoted item.  (optional)
    orderBy: name,id,
    // number | Number of items to skip before starting to collect the result set. (optional)
    offset: 789,
    // number | Maximum number of items to return in the response. Capped at 100. (optional)
    limit: 789,
    // boolean | Whether to expand resources referenced in the response to include additional fields (optional)
    expand: true,
  } satisfies ListDashboardsRequest;

  try {
    const data = await api.listDashboards(body);
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
| **filter** | `string` | [Common Expression Language (CEL)](https://cel.dev) expression that each dashboard must match. It must evaluate to a boolean.  **Identity and content:** &#x60;id&#x60; (int in CEL, string in JSON), &#x60;name&#x60;, &#x60;description&#x60; (string), &#x60;visibility&#x60; (&#x60;Listed&#x60; or &#x60;Hidden&#x60;).  **Audit:** &#x60;createdAt&#x60;, &#x60;updatedAt&#x60; (timestamp); &#x60;createdBy.id&#x60;, &#x60;updatedBy.id&#x60; (user id, int).  **Owner reference:** &#x60;managedBy.id&#x60; (int); &#x60;managedBy.record.label&#x60;, &#x60;managedBy.record.description&#x60; (string). These are filterable even without &#x60;expand&#x3D;true&#x60; — &#x60;expand&#x60; controls what is *returned*, not what can be filtered.  **Facets (filter-only, not sortable):**  | Field | CEL type | Notes | |---|---|---| | &#x60;objectTags&#x60; | &#x60;map(string, list(string))&#x60; | User-applied tags, as a map of tag key to a list of values. | | &#x60;parameters.correlationTags&#x60; | &#x60;list(string)&#x60; | Correlation-tag names picked by the dashboard\&#39;s &#x60;correlationTag&#x60;-kind parameters. | | &#x60;parameters.resources.ids&#x60; | &#x60;list(int)&#x60; | Dataset ids picked by the dashboard\&#39;s &#x60;resource&#x60;-kind parameters. | | &#x60;parameters.resources.names&#x60; | &#x60;list(string)&#x60; | Dataset names for the same &#x60;resource&#x60;-kind parameters. | | &#x60;queries.inputs.ids&#x60; | &#x60;list(int)&#x60; | Dataset ids bound to the dashboard\&#39;s query-card inputs. | | &#x60;queries.inputs.names&#x60; | &#x60;list(string)&#x60; | Dataset names for the same query-card inputs. | | &#x60;datasetFilter.id&#x60; | &#x60;int&#x60;, nullable | The primary dataset filter\&#39;s dataset id, when set. | | &#x60;datasetFilter.name&#x60; | &#x60;string&#x60;, nullable | The primary dataset filter\&#39;s dataset name, when set. |  Supports &#x60;matches()&#x60; for regex. Example: &#x60;name.matches(\&quot;prod.*\&quot;)&#x60;.  | [Optional] [Defaults to `undefined`] |
| **orderBy** | `string` | CSV list of [CEL](https://cel.dev) expressions, each producing a comparable value. Prefix an item with &#x60;-&#x60; for descending order. Default sort is &#x60;name&#x60; ascending, then &#x60;id&#x60; ascending.  Sortable fields: &#x60;id&#x60;, &#x60;name&#x60;, &#x60;description&#x60;, &#x60;visibility&#x60;, &#x60;createdAt&#x60;, &#x60;updatedAt&#x60;, &#x60;createdBy.id&#x60;, &#x60;updatedBy.id&#x60;, &#x60;managedBy.id&#x60;. Facet fields (&#x60;objectTags&#x60;, &#x60;parameters.*&#x60;, &#x60;queries.*&#x60;, &#x60;datasetFilter.*&#x60;) cannot be sorted.  CSV-escape first, then URL-encode. Wrap an item in &#x60;\&quot;&#x60; if it contains a comma or &#x60;\&quot;&#x60;; double a literal &#x60;\&quot;&#x60; to &#x60;\&quot;\&quot;&#x60; inside a quoted item.  | [Optional] [Defaults to `undefined`] |
| **offset** | `number` | Number of items to skip before starting to collect the result set. | [Optional] [Defaults to `undefined`] |
| **limit** | `number` | Maximum number of items to return in the response. Capped at 100. | [Optional] [Defaults to `undefined`] |
| **expand** | `boolean` | Whether to expand resources referenced in the response to include additional fields | [Optional] [Defaults to `undefined`] |

### Return type

[**DashboardListResponse**](DashboardListResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Dashboards queried successfully |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## updateDashboard

> DashboardResource updateDashboard(id, dashboardUpdateRequest, expand)

Update a dashboard

&gt; **Beta — may change; breaking changes are coordinated with affected &gt; customers. Suitable for evaluation, not production reliance.**  Merge-patch update ([RFC 7396](https://datatracker.ietf.org/doc/html/rfc7396)). Omitted fields are unchanged. When &#x60;definition&#x60; is present it replaces the whole document (not a deep merge).  &#x60;description&#x60; is the only field that accepts a JSON &#x60;null&#x60;, which clears it. Sending &#x60;null&#x60; for &#x60;schemaVersion&#x60;, &#x60;name&#x60;, &#x60;visibility&#x60;, &#x60;objectTags&#x60;, or &#x60;definition&#x60; is rejected; omit the field instead to leave it unchanged. 

### Example

```ts
import {
  Configuration,
  DashboardsApi,
} from '';
import type { UpdateDashboardRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new DashboardsApi(config);

  const body = {
    // string | Unique identifier of the dashboard (numeric id serialized as a string). 
    id: 41000001,
    // DashboardUpdateRequest
    dashboardUpdateRequest: ...,
    // boolean | Whether to expand resources referenced in the response to include additional fields (optional)
    expand: true,
  } satisfies UpdateDashboardRequest;

  try {
    const data = await api.updateDashboard(body);
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
| **id** | `string` | Unique identifier of the dashboard (numeric id serialized as a string).  | [Defaults to `undefined`] |
| **dashboardUpdateRequest** | [DashboardUpdateRequest](DashboardUpdateRequest.md) |  | |
| **expand** | `boolean` | Whether to expand resources referenced in the response to include additional fields | [Optional] [Defaults to `undefined`] |

### Return type

[**DashboardResource**](DashboardResource.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Dashboard updated successfully |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **404** | Resource not found |  -  |
| **409** | Conflict |  -  |
| **422** | Unprocessable entity — a required query parameter was omitted (e.g. &#x60;missing_field&#x60;). |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

