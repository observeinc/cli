# ExportApi

All URIs are relative to *https://OBSERVE_CUSTOMERID.observeinc.com*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**exportQuery**](ExportApi.md#exportqueryoperation) | **POST** /v1/meta/export/query | Execute an OPAL query |
| [**exportQueryPage**](ExportApi.md#exportquerypage) | **GET** /v1/meta/export/query/page | Fetch a page of query results |
| [**exportWorksheet**](ExportApi.md#exportworksheet) | **POST** /v1/meta/export/worksheet/{worksheetId} | Export a worksheet |



## exportQuery

> string exportQuery(exportQueryRequest, startTime, endTime, interval, stage, paginate)

Execute an OPAL query

Execute an OPAL query.  Results can be returned as CSV or NDJSON. * Set Accept header to &#x60;text/csv&#x60; or &#x60;application/x-ndjson&#x60; * Default: CSV  Either two of &#x60;startTime&#x60;, &#x60;endTime&#x60;, and &#x60;interval&#x60; or &#x60;interval&#x60; alone can be specified to set the time interval. The &#x60;startTime&#x60; parameter is inclusive and the &#x60;endTime&#x60; parameter is exclusive, to prevent overlap from subsequent windows.  * &#x60;interval&#x60;: An interval relative to now * &#x60;startTime&#x60; + &#x60;endTime&#x60;: The specified time interval * &#x60;startTime&#x60; **or** &#x60;endTime&#x60; + &#x60;interval&#x60;: The specified time interval relative to the provided start or end time  Inputs are specified as dataset IDs, or previously-defined stages.  Set paginate to true for an asynchronous paginated mode. The response will be 202 Accepted and contain headers for fetching the results via &#x60;/v1/meta/export/query/page&#x60;. You may also want to increase rowCount to allow large, paginated queries. 

### Example

```ts
import {
  Configuration,
  ExportApi,
} from '';
import type { ExportQueryOperationRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ExportApi(config);

  const body = {
    // ExportQueryRequest | The OPAL query text and input dataset bindings.
    exportQueryRequest: {"query":{"outputStage":"myStage","stages":[{"input":[{"inputName":"main","datasetId":"41007104"},{"inputName":"rds","datasetPath":"Workspace.aws/RDS Cluster"}],"stageID":"myStage","pipeline":"pick_col timestamp, log, namespace, containerName, rdsArn\nleftjoin on(rdsArn=@rds.arn), db:@rds.DBClusterIdentifier\n"}]},"rowCount":"2"},
    // string | Beginning of time window (inclusive) as ISO time. (optional)
    startTime: 2023-04-20T16:20:00Z,
    // string | End of time window (exclusive) as ISO time. Defaults to now if just `interval` is specified. (optional)
    endTime: 2023-04-20T16:30:00Z,
    // string | Length of time window (if start or end is missing). (optional)
    interval: 10m,
    // string | Which stage to get the data from. Defaults to last stage. (optional)
    stage: stage_example,
    // boolean | Whether to switch to an asynchronous paginated mode. Defaults to false. (optional)
    paginate: true,
  } satisfies ExportQueryOperationRequest;

  try {
    const data = await api.exportQuery(body);
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
| **exportQueryRequest** | [ExportQueryRequest](ExportQueryRequest.md) | The OPAL query text and input dataset bindings. | |
| **startTime** | `string` | Beginning of time window (inclusive) as ISO time. | [Optional] [Defaults to `undefined`] |
| **endTime** | `string` | End of time window (exclusive) as ISO time. Defaults to now if just &#x60;interval&#x60; is specified. | [Optional] [Defaults to `undefined`] |
| **interval** | `string` | Length of time window (if start or end is missing). | [Optional] [Defaults to `undefined`] |
| **stage** | `string` | Which stage to get the data from. Defaults to last stage. | [Optional] [Defaults to `undefined`] |
| **paginate** | `boolean` | Whether to switch to an asynchronous paginated mode. Defaults to false. | [Optional] [Defaults to `undefined`] |

### Return type

**string**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/x-ndjson`, `text/csv`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | ## Description of result data formats  ### Content-type: application/x-ndjson The results are returned with each row represented as distinct json objects separated by newlines. The contents of the json object representing each row is keys representing each column in the output, with values representing the value of that that column for that row.  ### Content-type: text/csv The results are returned in csv format, the first row in csv is a header row with the names of the columns.  |  -  |
| **202** | The paginated query request was accepted and will be executed asynchronously.  The response contains two headers that can be used to fetch the results.  There is no body sent. |  * X-Observe-Cursor-Id - The ID of a cursor that can be used to fetch the results; to be used with the /v1/meta/export/query/page endpoint.  See that endpoint for more details. <br>  * X-Observe-Next-Page - A link to the first page of results, which will contain the cursor ID query parameter, but will omit the offset and numRows query parameters. Those defaults can be overriden by adding them to the query parameters.  <br>  |
| **206** | The query was executed successfully, but the results returned cover only a part of the query window. This happens when the datasets queried are not accelerated for the entire query window. ## Description of result data formats  ### Content-type: application/x-ndjson The results are returned with each row represented as distinct json objects separated by newlines. The contents of the json object representing each row is keys representing each column in the output, with values representing the value of that that column for that row.  ### Content-type: text/csv The results are returned in csv format, the first row in csv is a header row with the names of the columns.  |  -  |
| **400** | Query not accepted. |  -  |
| **401** | Authorization missing. |  -  |
| **403** | Authorization denied. |  -  |
| **429** | Rate limit exceeded. |  -  |
| **500** | Internal error: query error. |  -  |
| **504** | Internal error: infrastructure error. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## exportQueryPage

> string exportQueryPage(cursorId, offset, numRows)

Fetch a page of query results

Fetch the results of a paginated \&quot;/v1/meta/export/query\&quot; request.  Note that paginate must be set to true and rowCount should be set high enough to contain the total expected result set.  This endpoint uses long polling behavior. If a query is in progress when a request is made, the server will delay responding for up to 30 seconds. If the query completes in that time period, the results will be returned with a 200 response code. Otherwise a 202 response code will be returned, and the client should retry the request. The endpoint will also return an error if the query failed.  Queries for paginated data will return an &#x60;X-Observe-Total-Rows&#x60; header and an &#x60;X-Observe-Next-Page&#x60; header with a URL for the next page, as long as one is needed. You can use the &#x60;X-Observe-Cursor-Id&#x60; and the &#x60;offset&#x60; and &#x60;numRows&#x60; parameters to construct your own next page URL with different page sizes.  The results can be returned as CSV or NDJSON. The query parameters are used to specify which page of results to fetch. * Set Accept header to &#x60;text/csv&#x60; or &#x60;application/x-ndjson&#x60; * Default: CSV  The number of rows in the full result set is returned in the X-Observe-Total-Rows response header. 

### Example

```ts
import {
  Configuration,
  ExportApi,
} from '';
import type { ExportQueryPageRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ExportApi(config);

  const body = {
    // string | The ID of a cursor
    cursorId: 123e4567-e89b-12d3-a456-426614174000,
    // string | Offset into the result set for the page to begin at (optional)
    offset: 1000,
    // string | The number of rows to return in the page (optional)
    numRows: 1000,
  } satisfies ExportQueryPageRequest;

  try {
    const data = await api.exportQueryPage(body);
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
| **cursorId** | `string` | The ID of a cursor | [Defaults to `undefined`] |
| **offset** | `string` | Offset into the result set for the page to begin at | [Optional] [Defaults to `undefined`] |
| **numRows** | `string` | The number of rows to return in the page | [Optional] [Defaults to `undefined`] |

### Return type

**string**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/x-ndjson`, `text/csv`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | The query is completed and the requested page of results are returned in the body in the format requested by the Accept header. The total number of rows in the full result set is returned in the X-Observe-Total-Rows response header.  ## Description of result data formats  ### Content-type: application/x-ndjson The results are returned with each row represented as distinct json objects separated by newlines. The contents of the json object representing each row is keys representing each column in the output, with values representing the value of that that column for that row.  ### Content-type: text/csv The results are returned in csv format, the first row in csv is a header row with the names of the columns.  |  * X-Observe-Next-Page - A link to the next page of results if there is one, otherwise this header is not present. <br>  * X-Observe-Total-Rows - The number of rows in the full result set. <br>  |
| **202** | The query is still in progress; even after waiting for 30 seconds from the request being recieved.  The body of the response will be empty.  The response headers contain the following:  |  * X-Observe-Next-Page - A link to the first page of results. <br>  |
| **400** | Invalid request. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## exportWorksheet

> string exportWorksheet(worksheetId, startTime, endTime, interval, stage)

Export a worksheet

Export data used by a worksheet.  Results are limited to a maximum of 100,000 rows.  Results can be returned as CSV or NDJSON. * Set Accept header to &#x60;text/csv&#x60; or &#x60;application/x-ndjson&#x60; * Default: CSV    Either two of &#x60;startTime&#x60;, &#x60;endTime&#x60;, and &#x60;interval&#x60; or &#x60;interval&#x60; alone can be specified to set the time interval. The &#x60;startTime&#x60; parameter is inclusive and the &#x60;endTime&#x60; parameter is exclusive, to prevent overlap from subsequent windows.  * &#x60;interval&#x60;: An interval relative to now * &#x60;startTime&#x60; + &#x60;endTime&#x60;: The specified time interval * &#x60;startTime&#x60; **or** &#x60;endTime&#x60; + &#x60;interval&#x60;: The specified time interval relative to the provided start or end time 

### Example

```ts
import {
  Configuration,
  ExportApi,
} from '';
import type { ExportWorksheetRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ExportApi(config);

  const body = {
    // number | ID of the worksheet to export.
    worksheetId: 123456789,
    // string | Beginning of time window (inclusive) as ISO time. (optional)
    startTime: 2023-04-20T16:20:00Z,
    // string | End of time window (exclusive) as ISO time. Defaults to now if just `interval` is specified. (optional)
    endTime: 2023-04-20T16:30:00Z,
    // string | Length of time window (if start or end is missing). (optional)
    interval: 10m,
    // string | Which stage to get the data from. Defaults to last stage. (optional)
    stage: stage_example,
  } satisfies ExportWorksheetRequest;

  try {
    const data = await api.exportWorksheet(body);
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
| **worksheetId** | `number` | ID of the worksheet to export. | [Defaults to `undefined`] |
| **startTime** | `string` | Beginning of time window (inclusive) as ISO time. | [Optional] [Defaults to `undefined`] |
| **endTime** | `string` | End of time window (exclusive) as ISO time. Defaults to now if just &#x60;interval&#x60; is specified. | [Optional] [Defaults to `undefined`] |
| **interval** | `string` | Length of time window (if start or end is missing). | [Optional] [Defaults to `undefined`] |
| **stage** | `string` | Which stage to get the data from. Defaults to last stage. | [Optional] [Defaults to `undefined`] |

### Return type

**string**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/x-ndjson`, `text/csv`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | ## Description of result data formats  ### Content-type: application/x-ndjson The results are returned with each row represented as distinct json objects separated by newlines. The contents of the json object representing each row is keys representing each column in the output, with values representing the value of that that column for that row.  ### Content-type: text/csv The results are returned in csv format, the first row in csv is a header row with the names of the columns.  |  -  |
| **400** | Invalid request. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

