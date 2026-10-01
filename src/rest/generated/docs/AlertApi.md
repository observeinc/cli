# AlertApi

All URIs are relative to *https://OBSERVE_CUSTOMERID.observeinc.com*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**getAlert**](AlertApi.md#getalert) | **GET** /v1/alerts/{id} | Get an alert by id |
| [**listAlerts**](AlertApi.md#listalerts) | **GET** /v1/alerts | List alerts |



## getAlert

> AlertResource getAlert(id, expand)

Get an alert by id

Get a single alert by its unique id. Unlike the list endpoint, this lookup is not time-windowed: it returns the alert regardless of how long ago it fired. Returns 404 if no alert with the given id exists in the workspace or if the caller lacks view permission on the alert\&#39;s monitor. 

### Example

```ts
import {
  Configuration,
  AlertApi,
} from '';
import type { GetAlertRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new AlertApi(config);

  const body = {
    // string | Unique identifier of the alert.
    id: 38400000-8cf0-11bd-b23e-10b96e4ef00d,
    // boolean | Whether to expand resources referenced in the response to include additional fields (optional)
    expand: true,
  } satisfies GetAlertRequest;

  try {
    const data = await api.getAlert(body);
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
| **id** | `string` | Unique identifier of the alert. | [Defaults to `undefined`] |
| **expand** | `boolean` | Whether to expand resources referenced in the response to include additional fields | [Optional] [Defaults to `undefined`] |

### Return type

[**AlertResource**](AlertResource.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Alert found |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **404** | Resource not found |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listAlerts

> AlertListResponse listAlerts(filter, orderBy, startTime, endTime, activeAt, offset, limit, expand, includeFacets)

List alerts

List monitor alerts, optionally filtering and sorting the response. Filters are specified in the [CEL query language](https://cel.dev). Supported orderBy fields: id, level, status, start, monitor.id, monitor.label. Time scoping can be provided in two ways (mutually exclusive): - startTime/endTime: a time range. Alerts overlapping this range are returned. Defaults to the last 24 hours. - activeAt: a single timestamp. Returns alerts that were active at that moment. If both activeAt and startTime/endTime are provided, returns 400. Default page size is 200, maximum is 1000. 

### Example

```ts
import {
  Configuration,
  AlertApi,
} from '';
import type { ListAlertsRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new AlertApi(config);

  const body = {
    // string | Filter that response alerts must match. Specified in CEL format. Note that filter expressions must be URL encoded.  Supported filter fields: - `id` (string): unique alert identifier - `level` (string): one of `Critical`, `Error`, `Warning`, `Informational`, `NoData`, `None` - `status` (string): one of `Active`, `Ended`, `Retracted` - `monitor.id` (int): ID of the monitor that generated the alert - `monitor.label` (string): display label of the monitor (supports `.contains()`, `.startsWith()`, `.endsWith()`, and `.lowerAscii()` for case-insensitive matching) - `muted` (bool): whether the alert is muted (`true` / `false`) - `hasAiChat` (bool): whether an AI investigation exists for the alert. Tied to a feature under development, and rejected as an unknown field where that feature is not enabled. - `context.<key>` (string): context value by key, where `<key>` is a GroupBy column name from the monitor definition. Use dot notation to access context fields. Supports `.contains()`, `.startsWith()`, `.endsWith()`.  (optional)
    filter: muted == true,
    // string | A comma-separated list of field expressions to sort by. Prefix a field with - for descending order (default is ascending). Default sort is by start time, descending.  (optional)
    orderBy: -start,
    // string | Start of the time range to query. Alerts that overlap this range are returned (i.e., alerts whose end time is after startTime, or that are still active). Defaults to 24 hours ago if not provided.  (optional)
    startTime: startTime_example,
    // string | End of the time range to query. Alerts whose start time is before endTime are returned. Defaults to current time if not provided.  (optional)
    endTime: endTime_example,
    // string | A single timestamp to query alerts that were active at that moment. Returns alerts where start <= activeAt and (end >= activeAt or the alert is still active). Mutually exclusive with startTime and endTime — if both are provided, returns 400.  (optional)
    activeAt: activeAt_example,
    // number | Number of items to skip before starting to collect the result set (optional)
    offset: 789,
    // number | Maximum number of items to return in the response (optional)
    limit: 789,
    // boolean | Whether to expand resources referenced in the response to include additional fields (optional)
    expand: true,
    // boolean | When true, the response includes faceted counts for key alert attributes, computed over all alerts in the requested time window. These counts ignore any `filter`, `orderBy`, `offset`, or `limit` parameters, making them suitable for building filter panels.  (optional)
    includeFacets: true,
  } satisfies ListAlertsRequest;

  try {
    const data = await api.listAlerts(body);
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
| **filter** | `string` | Filter that response alerts must match. Specified in CEL format. Note that filter expressions must be URL encoded.  Supported filter fields: - &#x60;id&#x60; (string): unique alert identifier - &#x60;level&#x60; (string): one of &#x60;Critical&#x60;, &#x60;Error&#x60;, &#x60;Warning&#x60;, &#x60;Informational&#x60;, &#x60;NoData&#x60;, &#x60;None&#x60; - &#x60;status&#x60; (string): one of &#x60;Active&#x60;, &#x60;Ended&#x60;, &#x60;Retracted&#x60; - &#x60;monitor.id&#x60; (int): ID of the monitor that generated the alert - &#x60;monitor.label&#x60; (string): display label of the monitor (supports &#x60;.contains()&#x60;, &#x60;.startsWith()&#x60;, &#x60;.endsWith()&#x60;, and &#x60;.lowerAscii()&#x60; for case-insensitive matching) - &#x60;muted&#x60; (bool): whether the alert is muted (&#x60;true&#x60; / &#x60;false&#x60;) - &#x60;hasAiChat&#x60; (bool): whether an AI investigation exists for the alert. Tied to a feature under development, and rejected as an unknown field where that feature is not enabled. - &#x60;context.&lt;key&gt;&#x60; (string): context value by key, where &#x60;&lt;key&gt;&#x60; is a GroupBy column name from the monitor definition. Use dot notation to access context fields. Supports &#x60;.contains()&#x60;, &#x60;.startsWith()&#x60;, &#x60;.endsWith()&#x60;.  | [Optional] [Defaults to `undefined`] |
| **orderBy** | `string` | A comma-separated list of field expressions to sort by. Prefix a field with - for descending order (default is ascending). Default sort is by start time, descending.  | [Optional] [Defaults to `undefined`] |
| **startTime** | `string` | Start of the time range to query. Alerts that overlap this range are returned (i.e., alerts whose end time is after startTime, or that are still active). Defaults to 24 hours ago if not provided.  | [Optional] [Defaults to `undefined`] |
| **endTime** | `string` | End of the time range to query. Alerts whose start time is before endTime are returned. Defaults to current time if not provided.  | [Optional] [Defaults to `undefined`] |
| **activeAt** | `string` | A single timestamp to query alerts that were active at that moment. Returns alerts where start &lt;&#x3D; activeAt and (end &gt;&#x3D; activeAt or the alert is still active). Mutually exclusive with startTime and endTime — if both are provided, returns 400.  | [Optional] [Defaults to `undefined`] |
| **offset** | `number` | Number of items to skip before starting to collect the result set | [Optional] [Defaults to `undefined`] |
| **limit** | `number` | Maximum number of items to return in the response | [Optional] [Defaults to `undefined`] |
| **expand** | `boolean` | Whether to expand resources referenced in the response to include additional fields | [Optional] [Defaults to `undefined`] |
| **includeFacets** | `boolean` | When true, the response includes faceted counts for key alert attributes, computed over all alerts in the requested time window. These counts ignore any &#x60;filter&#x60;, &#x60;orderBy&#x60;, &#x60;offset&#x60;, or &#x60;limit&#x60; parameters, making them suitable for building filter panels.  | [Optional] [Defaults to `undefined`] |

### Return type

[**AlertListResponse**](AlertListResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Alerts queried successfully |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

