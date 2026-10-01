# APMApi

All URIs are relative to *https://OBSERVE_CUSTOMERID.observeinc.com*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**getApmInvocationGraph**](APMApi.md#getapminvocationgraph) | **GET** /v1/apm/invocation-graph | Get the APM service invocation graph |
| [**listApmEnvironments**](APMApi.md#listapmenvironments) | **GET** /v1/apm/environments | List APM environments |
| [**listApmServices**](APMApi.md#listapmservices) | **GET** /v1/apm/services | List APM services with RED metrics |



## getApmInvocationGraph

> ApmInvocationGraphResponse getApmInvocationGraph(serviceName, environment, serviceNamespace, endpointName, directNeighborsOnly, startTime, endTime, limit, offset)

Get the APM service invocation graph

&gt; **Beta — may change; breaking changes are coordinated with affected &gt; customers. Suitable for evaluation, not production reliance.**  Returns the service dependency graph for a time window: the services observed and the calls between them, always scoped to a single &#x60;environment&#x60; (required). Which graph you get depends on the identity parameters you add on top of &#x60;environment&#x60;: - &#x60;environment&#x60; only: the full graph for that environment. - &#x60;+ serviceName&#x60;: the graph centered on one service. - &#x60;+ serviceName&#x60; + &#x60;endpointName&#x60;: centered on one endpoint of that   service.  &#x60;services&#x60; lists every service in the graph; &#x60;invocations&#x60; lists the calls between them, each from a &#x60;source&#x60; to a &#x60;target&#x60; with aggregated request, error, and latency metrics. A service that is never the &#x60;target&#x60; of a call is a root.  When centered on an endpoint, &#x60;endpointName&#x60; is set on whichever side of a call is that endpoint — &#x60;source&#x60; when the endpoint makes the call, &#x60;target&#x60; when it serves the call — and is null on every other participant. Match it exactly against the value from a prior response.  By default the full graph for the scope is returned. Set &#x60;directNeighborsOnly&#x3D;true&#x60; (with a &#x60;serviceName&#x60;) to return only the focal service and the services one hop away from it. If a full graph is not available for a request, it is rejected with &#x60;BadRequest&#x60; indicating &#x60;directNeighborsOnly&#x3D;true&#x60; should be used.  &#x60;serviceNamespace&#x60; is an optional additional filter that matches on either end of a call (a call is kept when its &#x60;source&#x60; or &#x60;target&#x60; is in that namespace — a cross-namespace union). &#x60;environment&#x60;, by contrast, matches on both ends: a call is kept only when both its &#x60;source&#x60; and &#x60;target&#x60; are in that environment.  Required parameter combinations: &#x60;environment&#x60; is always required (&#x60;400 RequiredParamMissing&#x60; otherwise); &#x60;endpointName&#x60; and &#x60;directNeighborsOnly&#x60; each require a &#x60;serviceName&#x60;.  The graph is returned in a single response and is not paginated. A request whose graph would exceed the maximum size is rejected with &#x60;413 PayloadTooLarge&#x60; rather than truncated. Narrow the time window, or center the graph on a service or endpoint, to reduce its size. 

### Example

```ts
import {
  Configuration,
  APMApi,
} from '';
import type { GetApmInvocationGraphRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new APMApi(config);

  const body = {
    // string | OTel service.name. Single-value exact-match filter; omit (or pass an empty value) to match services with any service.name.  (optional)
    serviceName: serviceName_example,
    // string | OTel deployment.environment, matched exactly. Required: the invocation graph is always scoped to a single environment. Omitting it returns `400 RequiredParamMissing`.  (optional)
    environment: environment_example,
    // string | OTel service.namespace. Single-value exact-match filter; omit (or pass an empty value) to match services in any namespace.  (optional)
    serviceNamespace: serviceNamespace_example,
    // string | Name of an endpoint on the service to center the graph on, matched exactly. Requires `serviceName` and `environment`.  (optional)
    endpointName: endpointName_example,
    // boolean | Return only the focal service and the services directly connected to it (one hop away). Requires `serviceName`. Omit (the default) to return the full graph.  (optional)
    directNeighborsOnly: true,
    // string | RFC3339 window start (inclusive). The query window is `[startTime, endTime)`. The two bounds are independent: omit `startTime` and it defaults to `endTime − 1h`; omit `endTime` and it defaults to now; omit both for the last hour. `startTime` must be earlier than `endTime`, otherwise `BadRequest`.  (optional)
    startTime: 2013-10-20T19:20:30+01:00,
    // string | RFC3339 window end (exclusive). Defaults to now when omitted. Pairs with `startTime` to form the `[startTime, endTime)` window; see `startTime` for the full defaulting rule.  (optional)
    endTime: 2013-10-20T19:20:30+01:00,
    // number | Not accepted on this endpoint — the dependency graph is returned in a single response, not a paginated list. Supplying `limit` returns `BadRequest`.  (optional)
    limit: 789,
    // number | Not accepted on this endpoint (see `limit`). Supplying `offset` returns `BadRequest`.  (optional)
    offset: 789,
  } satisfies GetApmInvocationGraphRequest;

  try {
    const data = await api.getApmInvocationGraph(body);
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
| **serviceName** | `string` | OTel service.name. Single-value exact-match filter; omit (or pass an empty value) to match services with any service.name.  | [Optional] [Defaults to `undefined`] |
| **environment** | `string` | OTel deployment.environment, matched exactly. Required: the invocation graph is always scoped to a single environment. Omitting it returns &#x60;400 RequiredParamMissing&#x60;.  | [Optional] [Defaults to `undefined`] |
| **serviceNamespace** | `string` | OTel service.namespace. Single-value exact-match filter; omit (or pass an empty value) to match services in any namespace.  | [Optional] [Defaults to `undefined`] |
| **endpointName** | `string` | Name of an endpoint on the service to center the graph on, matched exactly. Requires &#x60;serviceName&#x60; and &#x60;environment&#x60;.  | [Optional] [Defaults to `undefined`] |
| **directNeighborsOnly** | `boolean` | Return only the focal service and the services directly connected to it (one hop away). Requires &#x60;serviceName&#x60;. Omit (the default) to return the full graph.  | [Optional] [Defaults to `false`] |
| **startTime** | `string` | RFC3339 window start (inclusive). The query window is &#x60;[startTime, endTime)&#x60;. The two bounds are independent: omit &#x60;startTime&#x60; and it defaults to &#x60;endTime − 1h&#x60;; omit &#x60;endTime&#x60; and it defaults to now; omit both for the last hour. &#x60;startTime&#x60; must be earlier than &#x60;endTime&#x60;, otherwise &#x60;BadRequest&#x60;.  | [Optional] [Defaults to `undefined`] |
| **endTime** | `string` | RFC3339 window end (exclusive). Defaults to now when omitted. Pairs with &#x60;startTime&#x60; to form the &#x60;[startTime, endTime)&#x60; window; see &#x60;startTime&#x60; for the full defaulting rule.  | [Optional] [Defaults to `undefined`] |
| **limit** | `number` | Not accepted on this endpoint — the dependency graph is returned in a single response, not a paginated list. Supplying &#x60;limit&#x60; returns &#x60;BadRequest&#x60;.  | [Optional] [Defaults to `undefined`] |
| **offset** | `number` | Not accepted on this endpoint (see &#x60;limit&#x60;). Supplying &#x60;offset&#x60; returns &#x60;BadRequest&#x60;.  | [Optional] [Defaults to `undefined`] |

### Return type

[**ApmInvocationGraphResponse**](ApmInvocationGraphResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Invocation graph returned successfully. |  -  |
| **400** | Bad request (BadRequest, RequiredParamMissing, InvalidTimestamp, OutOfAcceleratedRange, NotConfigured). |  -  |
| **401** | Unauthorized — missing or invalid credentials (platform auth layer; body conforms to Apm-Error). |  -  |
| **403** | Forbidden — caller lacks permission for this resource (body conforms to Apm-Error). |  -  |
| **404** | Not found — unrecognized route (body conforms to Apm-Error). |  -  |
| **413** | Payload too large (PayloadTooLarge). |  -  |
| **500** | Internal server error (InternalError). |  -  |
| **504** | Query timed out (TimedOut). |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listApmEnvironments

> ApmEnvironmentsListResponse listApmEnvironments(environment, startTime, endTime, limit, offset, orderBy)

List APM environments

&gt; **Beta — may change; breaking changes are coordinated with affected &gt; customers. Suitable for evaluation, not production reliance.**  Lists environments and the service namespaces with active telemetry in the &#x60;[startTime, endTime)&#x60; window. &#x60;environment&#x60; is an optional exact-match filter (omit to return all environments). This endpoint does not bucket metrics, so it accepts only &#x60;startTime&#x60;/&#x60;endTime&#x60; (no series bucketing) and returns no &#x60;redMetrics&#x60; and no &#x60;related&#x60;.  Each row\&#39;s &#x60;serviceNamespaces&#x60; is the set observed for that environment, capped at a server limit; when the full set exceeds the cap, the array is truncated and &#x60;truncated&#x60; is true. The list is never paged separately — pagination is on the environments axis. Services emitting no &#x60;service.namespace&#x60; contribute nothing; the array never contains null. 

### Example

```ts
import {
  Configuration,
  APMApi,
} from '';
import type { ListApmEnvironmentsRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new APMApi(config);

  const body = {
    // string | OTel deployment.environment. Single-value exact-match filter; omit (or pass an empty value) to match services in any environment.  (optional)
    environment: environment_example,
    // string | RFC3339 window start (inclusive). The query window is `[startTime, endTime)`. The two bounds are independent: omit `startTime` and it defaults to `endTime − 1h`; omit `endTime` and it defaults to now; omit both for the last hour. `startTime` must be earlier than `endTime`, otherwise `BadRequest`.  (optional)
    startTime: 2013-10-20T19:20:30+01:00,
    // string | RFC3339 window end (exclusive). Defaults to now when omitted. Pairs with `startTime` to form the `[startTime, endTime)` window; see `startTime` for the full defaulting rule.  (optional)
    endTime: 2013-10-20T19:20:30+01:00,
    // number | Max items per page. Default 100, range [1, 100000]. (optional)
    limit: 789,
    // number | Items to skip before the page starts. Default 0. (optional)
    offset: 789,
    // ListApmEnvironmentsOrderByParameter | Sort key (single key; leading `-` for descending). Default: `environment`. Allowed: `environment` (and `-environment`). Ties are broken by `environment` ascending (the primary key, so ties across rows are impossible — each environment appears once).  (optional)
    orderBy: ...,
  } satisfies ListApmEnvironmentsRequest;

  try {
    const data = await api.listApmEnvironments(body);
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
| **environment** | `string` | OTel deployment.environment. Single-value exact-match filter; omit (or pass an empty value) to match services in any environment.  | [Optional] [Defaults to `undefined`] |
| **startTime** | `string` | RFC3339 window start (inclusive). The query window is &#x60;[startTime, endTime)&#x60;. The two bounds are independent: omit &#x60;startTime&#x60; and it defaults to &#x60;endTime − 1h&#x60;; omit &#x60;endTime&#x60; and it defaults to now; omit both for the last hour. &#x60;startTime&#x60; must be earlier than &#x60;endTime&#x60;, otherwise &#x60;BadRequest&#x60;.  | [Optional] [Defaults to `undefined`] |
| **endTime** | `string` | RFC3339 window end (exclusive). Defaults to now when omitted. Pairs with &#x60;startTime&#x60; to form the &#x60;[startTime, endTime)&#x60; window; see &#x60;startTime&#x60; for the full defaulting rule.  | [Optional] [Defaults to `undefined`] |
| **limit** | `number` | Max items per page. Default 100, range [1, 100000]. | [Optional] [Defaults to `100`] |
| **offset** | `number` | Items to skip before the page starts. Default 0. | [Optional] [Defaults to `0`] |
| **orderBy** | `ListApmEnvironmentsOrderByParameter` | Sort key (single key; leading &#x60;-&#x60; for descending). Default: &#x60;environment&#x60;. Allowed: &#x60;environment&#x60; (and &#x60;-environment&#x60;). Ties are broken by &#x60;environment&#x60; ascending (the primary key, so ties across rows are impossible — each environment appears once).  | [Optional] [Defaults to `undefined`] [Enum: environment, -environment] |

### Return type

[**ApmEnvironmentsListResponse**](ApmEnvironmentsListResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Environments listed successfully. |  -  |
| **400** | Bad request (BadRequest, RequiredParamMissing, InvalidTimestamp, OutOfAcceleratedRange, NotConfigured). |  -  |
| **401** | Unauthorized — missing or invalid credentials (platform auth layer; body conforms to Apm-Error). |  -  |
| **403** | Forbidden — caller lacks permission for this resource (body conforms to Apm-Error). |  -  |
| **404** | Not found — unrecognized route (body conforms to Apm-Error). |  -  |
| **413** | Payload too large (PayloadTooLarge). |  -  |
| **500** | Internal server error (InternalError). |  -  |
| **504** | Query timed out (TimedOut). |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listApmServices

> ApmServicesListResponse listApmServices(serviceName, environment, serviceNamespace, startTime, endTime, expand, limit, offset, orderBy)

List APM services with RED metrics

&gt; **Beta — may change; breaking changes are coordinated with affected &gt; customers. Suitable for evaluation, not production reliance.**  Lists services, one row per service, each carrying a closed RED metrics snapshot under &#x60;redMetrics&#x60;. Filters are exact-match on &#x60;serviceName&#x60;, &#x60;environment&#x60;, and &#x60;serviceNamespace&#x60;; an omitted filter matches every value of that dimension.  When &#x60;expand&#x3D;true&#x60;, each row\&#39;s &#x60;redMetrics.series[]&#x60; additionally carries a per-bucket time series across the query window; read the bucket cadence from the spacing between consecutive &#x60;series[].timestamp&#x60;. When &#x60;expand&#x60; is false or omitted, &#x60;series&#x60; is absent (not &#x60;null&#x60;, not an empty array).  Zero matches return &#x60;200&#x60; with &#x60;services: []&#x60; and &#x60;meta.totalCount: 0&#x60;. &#x60;meta.totalCount&#x60; is &#x60;-1&#x60; when an exact count is too expensive to compute; in that case paginate by advancing &#x60;offset&#x60; until a page shorter than &#x60;limit&#x60; is returned.  Response size grows with the number of rows on the page and, when &#x60;expand&#x3D;true&#x60;, with the number of series points per row. A wide window combined with &#x60;expand&#x3D;true&#x60; can therefore make a single page exceed the server response-size limit and return &#x60;413 PayloadTooLarge&#x60;. Recover by narrowing the time window or requesting a smaller &#x60;limit&#x60;. &#x60;limit&#x60; is never rejected for being too large: it is clamped to its maximum server-side, and to a lower maximum when &#x60;expand&#x3D;true&#x60;. 

### Example

```ts
import {
  Configuration,
  APMApi,
} from '';
import type { ListApmServicesRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new APMApi(config);

  const body = {
    // string | OTel service.name. Single-value exact-match filter; omit (or pass an empty value) to match services with any service.name.  (optional)
    serviceName: serviceName_example,
    // string | OTel deployment.environment. Single-value exact-match filter; omit (or pass an empty value) to match services in any environment.  (optional)
    environment: environment_example,
    // string | OTel service.namespace. Single-value exact-match filter; omit (or pass an empty value) to match services in any namespace.  (optional)
    serviceNamespace: serviceNamespace_example,
    // string | RFC3339 window start (inclusive). The query window is `[startTime, endTime)`. The two bounds are independent: omit `startTime` and it defaults to `endTime − 1h`; omit `endTime` and it defaults to now; omit both for the last hour. `startTime` must be earlier than `endTime`, otherwise `BadRequest`.  (optional)
    startTime: 2013-10-20T19:20:30+01:00,
    // string | RFC3339 window end (exclusive). Defaults to now when omitted. Pairs with `startTime` to form the `[startTime, endTime)` window; see `startTime` for the full defaulting rule.  (optional)
    endTime: 2013-10-20T19:20:30+01:00,
    // boolean | Endpoint-specific opt-in. On /v1/apm/services, expand=true populates redMetrics.series[] on every row.  (optional)
    expand: true,
    // number | Max items per page. Default 100, range [1, 100000]. (optional)
    limit: 789,
    // number | Items to skip before the page starts. Default 0. (optional)
    offset: 789,
    // ListApmServicesOrderByParameter | Sort key (single key; leading `-` for descending). Default: `serviceName`. Allowed: `serviceName`, `environment`, `serviceNamespace`, `invocationRatePerSecond`, `errorRatePerSecond`, `durationP95Seconds` (and their `-` descending forms). Sorts on row-level scalars only — does not affect series order. Ties on the primary key are broken by `serviceName` ascending for deterministic pagination.  (optional)
    orderBy: ...,
  } satisfies ListApmServicesRequest;

  try {
    const data = await api.listApmServices(body);
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
| **serviceName** | `string` | OTel service.name. Single-value exact-match filter; omit (or pass an empty value) to match services with any service.name.  | [Optional] [Defaults to `undefined`] |
| **environment** | `string` | OTel deployment.environment. Single-value exact-match filter; omit (or pass an empty value) to match services in any environment.  | [Optional] [Defaults to `undefined`] |
| **serviceNamespace** | `string` | OTel service.namespace. Single-value exact-match filter; omit (or pass an empty value) to match services in any namespace.  | [Optional] [Defaults to `undefined`] |
| **startTime** | `string` | RFC3339 window start (inclusive). The query window is &#x60;[startTime, endTime)&#x60;. The two bounds are independent: omit &#x60;startTime&#x60; and it defaults to &#x60;endTime − 1h&#x60;; omit &#x60;endTime&#x60; and it defaults to now; omit both for the last hour. &#x60;startTime&#x60; must be earlier than &#x60;endTime&#x60;, otherwise &#x60;BadRequest&#x60;.  | [Optional] [Defaults to `undefined`] |
| **endTime** | `string` | RFC3339 window end (exclusive). Defaults to now when omitted. Pairs with &#x60;startTime&#x60; to form the &#x60;[startTime, endTime)&#x60; window; see &#x60;startTime&#x60; for the full defaulting rule.  | [Optional] [Defaults to `undefined`] |
| **expand** | `boolean` | Endpoint-specific opt-in. On /v1/apm/services, expand&#x3D;true populates redMetrics.series[] on every row.  | [Optional] [Defaults to `false`] |
| **limit** | `number` | Max items per page. Default 100, range [1, 100000]. | [Optional] [Defaults to `100`] |
| **offset** | `number` | Items to skip before the page starts. Default 0. | [Optional] [Defaults to `0`] |
| **orderBy** | `ListApmServicesOrderByParameter` | Sort key (single key; leading &#x60;-&#x60; for descending). Default: &#x60;serviceName&#x60;. Allowed: &#x60;serviceName&#x60;, &#x60;environment&#x60;, &#x60;serviceNamespace&#x60;, &#x60;invocationRatePerSecond&#x60;, &#x60;errorRatePerSecond&#x60;, &#x60;durationP95Seconds&#x60; (and their &#x60;-&#x60; descending forms). Sorts on row-level scalars only — does not affect series order. Ties on the primary key are broken by &#x60;serviceName&#x60; ascending for deterministic pagination.  | [Optional] [Defaults to `undefined`] [Enum: serviceName, -serviceName, environment, -environment, serviceNamespace, -serviceNamespace, invocationRatePerSecond, -invocationRatePerSecond, errorRatePerSecond, -errorRatePerSecond, durationP95Seconds, -durationP95Seconds] |

### Return type

[**ApmServicesListResponse**](ApmServicesListResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Services listed successfully. |  -  |
| **400** | Bad request (BadRequest, RequiredParamMissing, InvalidTimestamp, OutOfAcceleratedRange, NotConfigured). |  -  |
| **401** | Unauthorized — missing or invalid credentials. |  -  |
| **403** | Forbidden — the caller lacks permission for this resource. |  -  |
| **404** | Not found. |  -  |
| **413** | Payload too large (PayloadTooLarge). |  -  |
| **500** | Internal server error (InternalError). |  -  |
| **504** | Query timed out (TimedOut). |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

