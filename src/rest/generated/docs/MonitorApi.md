# MonitorApi

All URIs are relative to *https://OBSERVE_CUSTOMERID.observeinc.com*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**createMonitor**](MonitorApi.md#createmonitor) | **POST** /v1/monitors | Create a new MonitorV2 and bind to actions |
| [**createMonitorMuteRule**](MonitorApi.md#createmonitormuterule) | **POST** /v1/monitor-mute-rules | Create a new MonitorV2 Mute Rule |
| [**deleteMonitor**](MonitorApi.md#deletemonitor) | **DELETE** /v1/monitors/{id} | Delete a MonitorV2 |
| [**deleteMonitorMuteRule**](MonitorApi.md#deletemonitormuterule) | **DELETE** /v1/monitor-mute-rules/{id} | Delete a MonitorV2 Mute Rule |
| [**getMonitor**](MonitorApi.md#getmonitor) | **GET** /v1/monitors/{id} | Get a MonitorV2 |
| [**getMonitorMuteRule**](MonitorApi.md#getmonitormuterule) | **GET** /v1/monitor-mute-rules/{id} | Get a MonitorV2 Mute Rule |
| [**getMonitorStats**](MonitorApi.md#getmonitorstats) | **GET** /v1/monitors/stats | Get monitor attribute statistics |
| [**listMonitorMuteRules**](MonitorApi.md#listmonitormuterules) | **GET** /v1/monitor-mute-rules | List MonitorV2 Mute Rules with optional filters |
| [**listMonitors**](MonitorApi.md#listmonitors) | **GET** /v1/monitors | List monitors |
| [**updateMonitor**](MonitorApi.md#updatemonitor) | **PATCH** /v1/monitors/{id} | Update a MonitorV2 |



## createMonitor

> MonitorV2 createMonitor(monitorV2)

Create a new MonitorV2 and bind to actions

### Example

```ts
import {
  Configuration,
  MonitorApi,
} from '';
import type { CreateMonitorRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new MonitorApi(config);

  const body = {
    // MonitorV2 | The MonitorV2 to create
    monitorV2: ...,
  } satisfies CreateMonitorRequest;

  try {
    const data = await api.createMonitor(body);
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
| **monitorV2** | [MonitorV2](MonitorV2.md) | The MonitorV2 to create | |

### Return type

[**MonitorV2**](MonitorV2.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **201** | The monitor was created |  * Location - The URI to the newly created monitor <br>  |
| **400** | Invalid request |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## createMonitorMuteRule

> MonitorV2MuteRule createMonitorMuteRule(monitorV2MuteRule)

Create a new MonitorV2 Mute Rule

### Example

```ts
import {
  Configuration,
  MonitorApi,
} from '';
import type { CreateMonitorMuteRuleRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new MonitorApi(config);

  const body = {
    // MonitorV2MuteRule | The MonitorV2 Mute Rule to create
    monitorV2MuteRule: ...,
  } satisfies CreateMonitorMuteRuleRequest;

  try {
    const data = await api.createMonitorMuteRule(body);
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
| **monitorV2MuteRule** | [MonitorV2MuteRule](MonitorV2MuteRule.md) | The MonitorV2 Mute Rule to create | |

### Return type

[**MonitorV2MuteRule**](MonitorV2MuteRule.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **201** | The mute rule was created |  * Location - The URI to the newly created mute rule <br>  |
| **400** | Invalid request |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## deleteMonitor

> deleteMonitor(id)

Delete a MonitorV2

### Example

```ts
import {
  Configuration,
  MonitorApi,
} from '';
import type { DeleteMonitorRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new MonitorApi(config);

  const body = {
    // number | The Monitor object id
    id: 56,
  } satisfies DeleteMonitorRequest;

  try {
    const data = await api.deleteMonitor(body);
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
| **id** | `number` | The Monitor object id | [Defaults to `undefined`] |

### Return type

`void` (Empty response body)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **204** | The object was deleted |  -  |
| **400** | Invalid request |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## deleteMonitorMuteRule

> deleteMonitorMuteRule(id)

Delete a MonitorV2 Mute Rule

### Example

```ts
import {
  Configuration,
  MonitorApi,
} from '';
import type { DeleteMonitorMuteRuleRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new MonitorApi(config);

  const body = {
    // number | The Mute Rule object id
    id: 56,
  } satisfies DeleteMonitorMuteRuleRequest;

  try {
    const data = await api.deleteMonitorMuteRule(body);
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
| **id** | `number` | The Mute Rule object id | [Defaults to `undefined`] |

### Return type

`void` (Empty response body)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **204** | The object was deleted |  -  |
| **400** | Invalid request |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getMonitor

> MonitorV2 getMonitor(id)

Get a MonitorV2

### Example

```ts
import {
  Configuration,
  MonitorApi,
} from '';
import type { GetMonitorRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new MonitorApi(config);

  const body = {
    // number | The Monitor object id
    id: 56,
  } satisfies GetMonitorRequest;

  try {
    const data = await api.getMonitor(body);
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
| **id** | `number` | The Monitor object id | [Defaults to `undefined`] |

### Return type

[**MonitorV2**](MonitorV2.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | The object is returned  |  -  |
| **404** | The object was not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getMonitorMuteRule

> MonitorV2MuteRule getMonitorMuteRule(id)

Get a MonitorV2 Mute Rule

### Example

```ts
import {
  Configuration,
  MonitorApi,
} from '';
import type { GetMonitorMuteRuleRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new MonitorApi(config);

  const body = {
    // number | The Mute Rule object id
    id: 56,
  } satisfies GetMonitorMuteRuleRequest;

  try {
    const data = await api.getMonitorMuteRule(body);
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
| **id** | `number` | The Mute Rule object id | [Defaults to `undefined`] |

### Return type

[**MonitorV2MuteRule**](MonitorV2MuteRule.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | The object is returned  |  -  |
| **404** | The object was not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getMonitorStats

> MonitorStatsResponse getMonitorStats(attributes, topK, filter)

Get monitor attribute statistics

Counts monitors by one or more fields. No monitors are returned. Each entry in &#x60;attributes&#x60; is a field to group by, and the response carries one block per entry: that field\&#39;s distinct-value count, and its most frequent values with a count each. Grouping by &#x60;health&#x60; answers \&quot;how many monitors are in each health state\&quot;.  Fields are the ones &#x60;GET /v1/monitors&#x60; lists under &#x60;filter&#x60;, written the same way. An entry may also be a CEL expression over them, for buckets no single field provides: &#x60;aiTriagingMode &#x3D;&#x3D; \&quot;Triage\&quot;&#x60; gives &#x60;\&quot;true\&quot;&#x60; and &#x60;\&quot;false\&quot;&#x60; rather than one bucket per stored mode. The expression must yield one scalar per monitor — that value becomes the bucket key — so a list or object is rejected with &#x60;400&#x60;.  Keys come back as JSON strings whatever the field\&#39;s type: numbers as decimal digits, bools as &#x60;\&quot;true\&quot;&#x60; or &#x60;\&quot;false\&quot;&#x60;, timestamps as RFC 3339.  &#x60;meta&#x60; reports &#x60;totalMonitors&#x60; (before the filter) and &#x60;filteredMonitors&#x60; (after).  For example, facet counts for the list\&#39;s Health and Type columns:  &#x60;&#x60;&#x60; GET /v1/monitors/stats?attributes&#x3D;health,ruleKind&amp;topK&#x3D;10 &#x60;&#x60;&#x60;  The AI column\&#39;s two buckets, over enabled monitors only. Both values hold quotes, so both are CSV-escaped — inner &#x60;\&quot;&#x60; doubled, the item wrapped — then URL-encoded:  &#x60;&#x60;&#x60; GET /v1/monitors/stats   ?attributes&#x3D;\&quot;aiTriagingMode &#x3D;&#x3D; \&quot;\&quot;Triage\&quot;\&quot;\&quot;   &amp;filter&#x3D;disabled &#x3D;&#x3D; false &#x60;&#x60;&#x60; 

### Example

```ts
import {
  Configuration,
  MonitorApi,
} from '';
import type { GetMonitorStatsRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new MonitorApi(config);

  const body = {
    // string | Comma-separated list of the fields to group by — a field name from the `GET /v1/monitors` `filter` table, or a CEL expression over those fields. One statistic is computed per entry. Maximum 20 entries; an empty list returns `400`.  Because an expression may itself contain a comma or a quote, the list is CSV: wrap an entry in `\"` if it holds either, and double any literal `\"` inside a wrapped entry. CSV-escape first, URL-encode second. A bare field name needs neither, so the common case is just `attributes=health,ruleKind`. 
    attributes: attributes_example,
    // number | Number of top values to return per attribute, sorted by count descending. Range 1–100. Each attribute\'s total distinct count is reported in `distinctCount` regardless, so a caller can tell when values were left out. 
    topK: 789,
    // string | CEL expression restricting which monitors contribute to the statistics. Must evaluate to `bool`. Must be URL-encoded. If omitted, statistics cover every monitor the caller may read. See `GET /v1/monitors` for the field list and examples.  (optional)
    filter: filter_example,
  } satisfies GetMonitorStatsRequest;

  try {
    const data = await api.getMonitorStats(body);
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
| **attributes** | `string` | Comma-separated list of the fields to group by — a field name from the &#x60;GET /v1/monitors&#x60; &#x60;filter&#x60; table, or a CEL expression over those fields. One statistic is computed per entry. Maximum 20 entries; an empty list returns &#x60;400&#x60;.  Because an expression may itself contain a comma or a quote, the list is CSV: wrap an entry in &#x60;\&quot;&#x60; if it holds either, and double any literal &#x60;\&quot;&#x60; inside a wrapped entry. CSV-escape first, URL-encode second. A bare field name needs neither, so the common case is just &#x60;attributes&#x3D;health,ruleKind&#x60;.  | [Defaults to `undefined`] |
| **topK** | `number` | Number of top values to return per attribute, sorted by count descending. Range 1–100. Each attribute\&#39;s total distinct count is reported in &#x60;distinctCount&#x60; regardless, so a caller can tell when values were left out.  | [Defaults to `undefined`] |
| **filter** | `string` | CEL expression restricting which monitors contribute to the statistics. Must evaluate to &#x60;bool&#x60;. Must be URL-encoded. If omitted, statistics cover every monitor the caller may read. See &#x60;GET /v1/monitors&#x60; for the field list and examples.  | [Optional] [Defaults to `undefined`] |

### Return type

[**MonitorStatsResponse**](MonitorStatsResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Monitor statistics retrieved successfully |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listMonitorMuteRules

> Array&lt;MonitorV2MuteRuleTerse&gt; listMonitorMuteRules(nameExact, nameSubstring)

List MonitorV2 Mute Rules with optional filters

### Example

```ts
import {
  Configuration,
  MonitorApi,
} from '';
import type { ListMonitorMuteRulesRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new MonitorApi(config);

  const body = {
    // string | limit to an exact string match (optional)
    nameExact: nameExact_example,
    // string | limit to a substring match (optional)
    nameSubstring: nameSubstring_example,
  } satisfies ListMonitorMuteRulesRequest;

  try {
    const data = await api.listMonitorMuteRules(body);
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
| **nameExact** | `string` | limit to an exact string match | [Optional] [Defaults to `undefined`] |
| **nameSubstring** | `string` | limit to a substring match | [Optional] [Defaults to `undefined`] |

### Return type

[**Array&lt;MonitorV2MuteRuleTerse&gt;**](MonitorV2MuteRuleTerse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | An array of mute rule objects is returned  |  -  |
| **400** | Invalid request |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listMonitors

> MonitorListResponse listMonitors(filter, expand, limit, offset, orderBy, nameExact, nameSubstring, observeApiVersion)

List monitors

This operation has two response shapes, chosen per request by the &#x60;Observe-Api-Version&#x60; header.  **Default — stable.** Omit the header and the response is a plain JSON array of monitors. This is the long-standing behaviour that existing callers receive, and it does not change. It is summarised here rather than fully specified: the parameters and the response schema documented on this page describe the versioned shape.  **Versioned — rolling out.** Send &#x60;Observe-Api-Version: 2026-08-04&#x60; (or later) to get the paginated &#x60;{monitors, meta}&#x60; envelope specified below, with CEL &#x60;filter&#x60;, &#x60;limit&#x60;/&#x60;offset&#x60; paging, &#x60;orderBy&#x60; and &#x60;expand&#x60;. This shape is being rolled out account by account; until it reaches your account, sending the header returns &#x60;403&#x60;. An earlier or unparseable date selects the default shape instead. 

### Example

```ts
import {
  Configuration,
  MonitorApi,
} from '';
import type { ListMonitorsRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new MonitorApi(config);

  const body = {
    // string | CEL expression that returned monitors must match. Must evaluate to `bool`, and must be URL-encoded.  Only the fields below are filterable. An expression that fails to compile, or that references anything outside this table, is rejected with `400`; the field set is fixed, so retrying with a different spelling will not succeed. `createdBy.name` is a common example of a reference that is rejected — only `.id` is exposed on a user.  | Field | CEL type | Notes | |-------|----------|-------| | `id` | `int` | Compare unquoted, even though `id` serializes as a string in JSON. The default ordering. | | `label` | `string` | Supports `matches()` for an RE2 regex. | | `description` | `string` | Supports `matches()`. Compare against `\"\"` for \"no description\" — the response renders it as `null`, but the filter sees the empty string. | | `disabled` | `bool` | Turned off by a user, or by a limit. | | `ruleKind` | `string` | A `MonitorRuleKind` value, e.g. `\"Threshold\"`. | | `aiTriagingMode` | `string` | A `MonitorAiTriagingMode` value. `\"Triage\"` is the enabled state the list\'s AI auto-investigate column shows. | | `createdAt` | `timestamp` | Use `timestamp(\"2026-01-01T00:00:00Z\")` to compare. | | `updatedAt` | `timestamp` | | | `createdBy.id` | `int` | Id of the creating user. | | `updatedBy.id` | `int` | Id of the last user to update it. | | `managedBy.id` | `int` | Id of the managing app. Null when no app manages it. | | `managed` | `bool` | Whether an app manages this monitor. `managed == false` selects the user-managed monitors, which `managedBy.id == null` cannot express. | | `scheduled` | `bool` | Whether it runs on its own schedule. | | `disabledCause` | `string` | A `MonitorDisabledCause` value, e.g. `\"AlertRateLimit\"`. Null while enabled. | | `governorState` | `string` | A `MonitorGovernorState` value: `\"Normal\"`, `\"GracePeriod\"` or `\"CostDisabled\"`. Null when no spend limit is configured. | | `rollupStatus` | `string` | A `MonitorRollupStatus` value: the outcome of the monitor\'s own last run. Not every documented value is reachable — see the note below. | | `health` | `string` | A `MonitorHealth` value: one rollup of run outcome, disabled cause, spend-limit state and cluster failover state. This is the value the list\'s Health column shows. Not every documented value is reachable — see the note below. | | `alertState` | `string` | A `MonitorAlertState` value: `\"Triggering\"`, `\"Previous\"` or `\"Never\"`. | | `muteState` | `string` | A `MonitorMuteState` value. | | `muteCount` | `int` | Number of mute rules covering the monitor; `0` when unmuted. | | `mutedUntil` | `timestamp` | Null when not muted, or muted indefinitely. | | `lastAlarmTime` | `timestamp` | Null if it has never alerted. | | `lastErrorTime` | `timestamp` | Null if it has never logged a fatal error. | | `lastWarnTime` | `timestamp` | Null if it has never warned. |  Comparisons combine with `&&` and `||`. A nullable field is compared with `== null` / `!= null`; write the field on the left, since `null == lastAlarmTime` is not recognised as a null check.  When `filter` is used together with the deprecated `nameExact` or `nameSubstring` parameters, every condition must match.  (optional)
    filter: label.matches("checkout.*"),
    // boolean | When `true`, populates `label` on the `createdBy` and `updatedBy` references.  (optional)
    expand: true,
    // number | Maximum number of results to return. Defaults to 200, max 1000. (optional)
    limit: 789,
    // number | Number of results to skip for pagination. Defaults to 0. (optional)
    offset: 789,
    // string | Comma-separated fields to order by, each optionally prefixed with `-` for descending. Defaults to `id`.  Orderable fields: `id`, `label`, `description`, `ruleKind`, `disabled`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`, `managedBy`, `scheduled`, `muteState`, `rollupStatus`, `health`, `alertState`, `aiTriagingMode`, `lastAlarmTime`, `lastErrorTime`, `lastWarnTime`. Anything else is rejected with `400` — this list is narrower than the filterable fields, so check it rather than assuming a filterable field can also be sorted on.  `health` and `alertState` sort by severity, not alphabetically. `id` is appended as a final tiebreak so paging is deterministic.  (optional)
    orderBy: -lastAlarmTime,
    // string | Deprecated since API version 2026-08-04: use `filter` with `label == \"...\"` instead. Retained for backward compatibility; limits results to an exact match on the monitor label. When combined with `filter`, both conditions must match.  (optional)
    nameExact: nameExact_example,
    // string | Deprecated since API version 2026-08-04: use `filter` with `label.matches(\"...\")` instead. Retained for backward compatibility; limits results to a case-insensitive substring match on the monitor label. When combined with `filter`, both conditions must match.  (optional)
    nameSubstring: nameSubstring_example,
    // string | Selects the response shape by release date (YYYY-MM-DD). A date on or after `2026-08-04` returns the `{monitors, meta}` envelope documented below, and requires that shape to be enabled for your account (otherwise `403`). Omitting the header returns the legacy bare-array response, as does an earlier or unparseable date. The no-header default never changes.  (optional)
    observeApiVersion: observeApiVersion_example,
  } satisfies ListMonitorsRequest;

  try {
    const data = await api.listMonitors(body);
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
| **filter** | `string` | CEL expression that returned monitors must match. Must evaluate to &#x60;bool&#x60;, and must be URL-encoded.  Only the fields below are filterable. An expression that fails to compile, or that references anything outside this table, is rejected with &#x60;400&#x60;; the field set is fixed, so retrying with a different spelling will not succeed. &#x60;createdBy.name&#x60; is a common example of a reference that is rejected — only &#x60;.id&#x60; is exposed on a user.  | Field | CEL type | Notes | |-------|----------|-------| | &#x60;id&#x60; | &#x60;int&#x60; | Compare unquoted, even though &#x60;id&#x60; serializes as a string in JSON. The default ordering. | | &#x60;label&#x60; | &#x60;string&#x60; | Supports &#x60;matches()&#x60; for an RE2 regex. | | &#x60;description&#x60; | &#x60;string&#x60; | Supports &#x60;matches()&#x60;. Compare against &#x60;\&quot;\&quot;&#x60; for \&quot;no description\&quot; — the response renders it as &#x60;null&#x60;, but the filter sees the empty string. | | &#x60;disabled&#x60; | &#x60;bool&#x60; | Turned off by a user, or by a limit. | | &#x60;ruleKind&#x60; | &#x60;string&#x60; | A &#x60;MonitorRuleKind&#x60; value, e.g. &#x60;\&quot;Threshold\&quot;&#x60;. | | &#x60;aiTriagingMode&#x60; | &#x60;string&#x60; | A &#x60;MonitorAiTriagingMode&#x60; value. &#x60;\&quot;Triage\&quot;&#x60; is the enabled state the list\&#39;s AI auto-investigate column shows. | | &#x60;createdAt&#x60; | &#x60;timestamp&#x60; | Use &#x60;timestamp(\&quot;2026-01-01T00:00:00Z\&quot;)&#x60; to compare. | | &#x60;updatedAt&#x60; | &#x60;timestamp&#x60; | | | &#x60;createdBy.id&#x60; | &#x60;int&#x60; | Id of the creating user. | | &#x60;updatedBy.id&#x60; | &#x60;int&#x60; | Id of the last user to update it. | | &#x60;managedBy.id&#x60; | &#x60;int&#x60; | Id of the managing app. Null when no app manages it. | | &#x60;managed&#x60; | &#x60;bool&#x60; | Whether an app manages this monitor. &#x60;managed &#x3D;&#x3D; false&#x60; selects the user-managed monitors, which &#x60;managedBy.id &#x3D;&#x3D; null&#x60; cannot express. | | &#x60;scheduled&#x60; | &#x60;bool&#x60; | Whether it runs on its own schedule. | | &#x60;disabledCause&#x60; | &#x60;string&#x60; | A &#x60;MonitorDisabledCause&#x60; value, e.g. &#x60;\&quot;AlertRateLimit\&quot;&#x60;. Null while enabled. | | &#x60;governorState&#x60; | &#x60;string&#x60; | A &#x60;MonitorGovernorState&#x60; value: &#x60;\&quot;Normal\&quot;&#x60;, &#x60;\&quot;GracePeriod\&quot;&#x60; or &#x60;\&quot;CostDisabled\&quot;&#x60;. Null when no spend limit is configured. | | &#x60;rollupStatus&#x60; | &#x60;string&#x60; | A &#x60;MonitorRollupStatus&#x60; value: the outcome of the monitor\&#39;s own last run. Not every documented value is reachable — see the note below. | | &#x60;health&#x60; | &#x60;string&#x60; | A &#x60;MonitorHealth&#x60; value: one rollup of run outcome, disabled cause, spend-limit state and cluster failover state. This is the value the list\&#39;s Health column shows. Not every documented value is reachable — see the note below. | | &#x60;alertState&#x60; | &#x60;string&#x60; | A &#x60;MonitorAlertState&#x60; value: &#x60;\&quot;Triggering\&quot;&#x60;, &#x60;\&quot;Previous\&quot;&#x60; or &#x60;\&quot;Never\&quot;&#x60;. | | &#x60;muteState&#x60; | &#x60;string&#x60; | A &#x60;MonitorMuteState&#x60; value. | | &#x60;muteCount&#x60; | &#x60;int&#x60; | Number of mute rules covering the monitor; &#x60;0&#x60; when unmuted. | | &#x60;mutedUntil&#x60; | &#x60;timestamp&#x60; | Null when not muted, or muted indefinitely. | | &#x60;lastAlarmTime&#x60; | &#x60;timestamp&#x60; | Null if it has never alerted. | | &#x60;lastErrorTime&#x60; | &#x60;timestamp&#x60; | Null if it has never logged a fatal error. | | &#x60;lastWarnTime&#x60; | &#x60;timestamp&#x60; | Null if it has never warned. |  Comparisons combine with &#x60;&amp;&amp;&#x60; and &#x60;||&#x60;. A nullable field is compared with &#x60;&#x3D;&#x3D; null&#x60; / &#x60;!&#x3D; null&#x60;; write the field on the left, since &#x60;null &#x3D;&#x3D; lastAlarmTime&#x60; is not recognised as a null check.  When &#x60;filter&#x60; is used together with the deprecated &#x60;nameExact&#x60; or &#x60;nameSubstring&#x60; parameters, every condition must match.  | [Optional] [Defaults to `undefined`] |
| **expand** | `boolean` | When &#x60;true&#x60;, populates &#x60;label&#x60; on the &#x60;createdBy&#x60; and &#x60;updatedBy&#x60; references.  | [Optional] [Defaults to `undefined`] |
| **limit** | `number` | Maximum number of results to return. Defaults to 200, max 1000. | [Optional] [Defaults to `200`] |
| **offset** | `number` | Number of results to skip for pagination. Defaults to 0. | [Optional] [Defaults to `0`] |
| **orderBy** | `string` | Comma-separated fields to order by, each optionally prefixed with &#x60;-&#x60; for descending. Defaults to &#x60;id&#x60;.  Orderable fields: &#x60;id&#x60;, &#x60;label&#x60;, &#x60;description&#x60;, &#x60;ruleKind&#x60;, &#x60;disabled&#x60;, &#x60;createdAt&#x60;, &#x60;updatedAt&#x60;, &#x60;createdBy&#x60;, &#x60;updatedBy&#x60;, &#x60;managedBy&#x60;, &#x60;scheduled&#x60;, &#x60;muteState&#x60;, &#x60;rollupStatus&#x60;, &#x60;health&#x60;, &#x60;alertState&#x60;, &#x60;aiTriagingMode&#x60;, &#x60;lastAlarmTime&#x60;, &#x60;lastErrorTime&#x60;, &#x60;lastWarnTime&#x60;. Anything else is rejected with &#x60;400&#x60; — this list is narrower than the filterable fields, so check it rather than assuming a filterable field can also be sorted on.  &#x60;health&#x60; and &#x60;alertState&#x60; sort by severity, not alphabetically. &#x60;id&#x60; is appended as a final tiebreak so paging is deterministic.  | [Optional] [Defaults to `undefined`] |
| **nameExact** | `string` | Deprecated since API version 2026-08-04: use &#x60;filter&#x60; with &#x60;label &#x3D;&#x3D; \&quot;...\&quot;&#x60; instead. Retained for backward compatibility; limits results to an exact match on the monitor label. When combined with &#x60;filter&#x60;, both conditions must match.  | [Optional] [Defaults to `undefined`] |
| **nameSubstring** | `string` | Deprecated since API version 2026-08-04: use &#x60;filter&#x60; with &#x60;label.matches(\&quot;...\&quot;)&#x60; instead. Retained for backward compatibility; limits results to a case-insensitive substring match on the monitor label. When combined with &#x60;filter&#x60;, both conditions must match.  | [Optional] [Defaults to `undefined`] |
| **observeApiVersion** | `string` | Selects the response shape by release date (YYYY-MM-DD). A date on or after &#x60;2026-08-04&#x60; returns the &#x60;{monitors, meta}&#x60; envelope documented below, and requires that shape to be enabled for your account (otherwise &#x60;403&#x60;). Omitting the header returns the legacy bare-array response, as does an earlier or unparseable date. The no-header default never changes.  | [Optional] [Defaults to `undefined`] |

### Return type

[**MonitorListResponse**](MonitorListResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Monitors listed successfully |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## updateMonitor

> updateMonitor(id, monitorV2PatchRequest)

Update a MonitorV2

Partially updates a monitor. Only **PATCH** is supported for this URL.  **Top-level merge:** The server reads the current monitor, then for each of these properties—&#x60;name&#x60;, &#x60;disabled&#x60;, &#x60;description&#x60;, &#x60;ruleKind&#x60;, &#x60;definition&#x60;, &#x60;actionRules&#x60;—uses the request value if the key is present in the body, otherwise keeps the stored value. Keys omitted from the body do not change.  **Replace entire subtrees:** If &#x60;definition&#x60; or &#x60;actionRules&#x60; appears in the body, it **replaces the whole** stored &#x60;definition&#x60; or &#x60;actionRules&#x60; value. The server does **not** deep-merge inside &#x60;definition&#x60;, inside individual action rules, or inside nested structures (for example an action rule’s &#x60;definition&#x60;). To change part of the monitor definition or action configuration, send the complete &#x60;definition&#x60; and/or full &#x60;actionRules&#x60; array you want saved.  **Action rules:** when a rule\&#39;s &#x60;definition.inline&#x60; is &#x60;true&#x60; the action belongs to this monitor, and sending the rule back updates that action in place, keeping its &#x60;actionId&#x60;. To rotate a PagerDuty &#x60;routing_key&#x60;, which sits in &#x60;definition.webhook.body&#x60;, GET the monitor, edit the key, and PATCH &#x60;actionRules&#x60; back. A rule pointing at a shared action (&#x60;definition.inline&#x60; is &#x60;false&#x60;) is bound by &#x60;actionId&#x60; alone; change a shared action\&#39;s payload on the action itself.  **Not controlled by the body:** Other monitor fields (such as &#x60;id&#x60; from the path, or &#x60;monitorVersion&#x60;) are not updated from this JSON body using the merge rules above.  **Extra properties:** Any other top-level JSON properties in the body are ignored for this merge (they are not written to the monitor). 

### Example

```ts
import {
  Configuration,
  MonitorApi,
} from '';
import type { UpdateMonitorRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new MonitorApi(config);

  const body = {
    // number | The Monitor object id
    id: 56,
    // MonitorV2PatchRequest | Any subset of patchable fields. Omitted keys among `name`, `disabled`, `description`, `ruleKind`, `definition`, and `actionRules` leave the corresponding stored values unchanged. When `definition` or `actionRules` is sent, it must be the full replacement value for that field.  (optional)
    monitorV2PatchRequest: ...,
  } satisfies UpdateMonitorRequest;

  try {
    const data = await api.updateMonitor(body);
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
| **id** | `number` | The Monitor object id | [Defaults to `undefined`] |
| **monitorV2PatchRequest** | [MonitorV2PatchRequest](MonitorV2PatchRequest.md) | Any subset of patchable fields. Omitted keys among &#x60;name&#x60;, &#x60;disabled&#x60;, &#x60;description&#x60;, &#x60;ruleKind&#x60;, &#x60;definition&#x60;, and &#x60;actionRules&#x60; leave the corresponding stored values unchanged. When &#x60;definition&#x60; or &#x60;actionRules&#x60; is sent, it must be the full replacement value for that field.  | [Optional] |

### Return type

`void` (Empty response body)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **204** | The object was updated  |  -  |
| **400** | Invalid request |  -  |
| **404** | The object was not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

