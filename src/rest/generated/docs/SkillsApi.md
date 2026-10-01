# SkillsApi

All URIs are relative to *https://OBSERVE_CUSTOMERID.observeinc.com*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**createSkill**](SkillsApi.md#createskill) | **POST** /v1/skills | Create a skill |
| [**deleteSkill**](SkillsApi.md#deleteskill) | **DELETE** /v1/skills/{id} | Delete a skill |
| [**getSkill**](SkillsApi.md#getskill) | **GET** /v1/skills/{id} | Get a skill |
| [**listSkills**](SkillsApi.md#listskills) | **GET** /v1/skills | List skills |
| [**updateSkill**](SkillsApi.md#updateskill) | **PATCH** /v1/skills/{id} | Update a skill |



## createSkill

> SkillResource createSkill(skillCreateRequest, expand)

Create a skill

Create a new skill with the given metadata and content.

### Example

```ts
import {
  Configuration,
  SkillsApi,
} from '';
import type { CreateSkillRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new SkillsApi(config);

  const body = {
    // SkillCreateRequest
    skillCreateRequest: ...,
    // boolean | Whether to expand resources referenced in the response to include additional fields (optional)
    expand: true,
  } satisfies CreateSkillRequest;

  try {
    const data = await api.createSkill(body);
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
| **skillCreateRequest** | [SkillCreateRequest](SkillCreateRequest.md) |  | |
| **expand** | `boolean` | Whether to expand resources referenced in the response to include additional fields | [Optional] [Defaults to `undefined`] |

### Return type

[**SkillResource**](SkillResource.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **201** | Skill created successfully |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## deleteSkill

> deleteSkill(id)

Delete a skill

Delete a skill.

### Example

```ts
import {
  Configuration,
  SkillsApi,
} from '';
import type { DeleteSkillRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new SkillsApi(config);

  const body = {
    // string | The id of the skill to delete
    id: id_example,
  } satisfies DeleteSkillRequest;

  try {
    const data = await api.deleteSkill(body);
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
| **id** | `string` | The id of the skill to delete | [Defaults to `undefined`] |

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
| **204** | Skill deleted successfully |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **404** | Resource not found |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getSkill

> SkillResource getSkill(id, expand)

Get a skill

Retrieve a specific skill by ID.

### Example

```ts
import {
  Configuration,
  SkillsApi,
} from '';
import type { GetSkillRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new SkillsApi(config);

  const body = {
    // string | The id of the skill to retrieve
    id: id_example,
    // boolean | Whether to expand resources referenced in the response to include additional fields (optional)
    expand: true,
  } satisfies GetSkillRequest;

  try {
    const data = await api.getSkill(body);
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
| **id** | `string` | The id of the skill to retrieve | [Defaults to `undefined`] |
| **expand** | `boolean` | Whether to expand resources referenced in the response to include additional fields | [Optional] [Defaults to `undefined`] |

### Return type

[**SkillResource**](SkillResource.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Skill retrieved successfully |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **404** | Resource not found |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listSkills

> SkillListResponse listSkills(limit, offset, expand, orderBy, visibility)

List skills

Get a paginated list of skills. Returns metadata only by default; use expand&#x3D;true to include content.

### Example

```ts
import {
  Configuration,
  SkillsApi,
} from '';
import type { ListSkillsRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new SkillsApi(config);

  const body = {
    // number | Maximum number of items to return in the response (optional)
    limit: 789,
    // number | Number of items to skip before starting to collect the result set (optional)
    offset: 789,
    // boolean | Whether to expand resources referenced in the response to include additional fields (optional)
    expand: true,
    // string | Comma-separated list of fields to order by. Prefix with `-` for descending order. Supported fields: `id`, `label`, `createdAt`, `updatedAt`.  (optional)
    orderBy: -updatedAt,
    // ListSkillsVisibilityParameter | Filter skills by visibility. If omitted, returns skills based on access rules (creator sees all own skills; others see only Listed). (optional)
    visibility: ...,
  } satisfies ListSkillsRequest;

  try {
    const data = await api.listSkills(body);
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
| **limit** | `number` | Maximum number of items to return in the response | [Optional] [Defaults to `undefined`] |
| **offset** | `number` | Number of items to skip before starting to collect the result set | [Optional] [Defaults to `undefined`] |
| **expand** | `boolean` | Whether to expand resources referenced in the response to include additional fields | [Optional] [Defaults to `undefined`] |
| **orderBy** | `string` | Comma-separated list of fields to order by. Prefix with &#x60;-&#x60; for descending order. Supported fields: &#x60;id&#x60;, &#x60;label&#x60;, &#x60;createdAt&#x60;, &#x60;updatedAt&#x60;.  | [Optional] [Defaults to `undefined`] |
| **visibility** | `ListSkillsVisibilityParameter` | Filter skills by visibility. If omitted, returns skills based on access rules (creator sees all own skills; others see only Listed). | [Optional] [Defaults to `undefined`] [Enum: Listed, Unlisted] |

### Return type

[**SkillListResponse**](SkillListResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Skills listed successfully |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## updateSkill

> SkillResource updateSkill(id, skillUpdateRequest, expand)

Update a skill

Update an existing skill using JSON Merge Patch semantics.

### Example

```ts
import {
  Configuration,
  SkillsApi,
} from '';
import type { UpdateSkillRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new SkillsApi(config);

  const body = {
    // string | The id of the skill to update
    id: id_example,
    // SkillUpdateRequest
    skillUpdateRequest: ...,
    // boolean | Whether to expand resources referenced in the response to include additional fields (optional)
    expand: true,
  } satisfies UpdateSkillRequest;

  try {
    const data = await api.updateSkill(body);
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
| **id** | `string` | The id of the skill to update | [Defaults to `undefined`] |
| **skillUpdateRequest** | [SkillUpdateRequest](SkillUpdateRequest.md) |  | |
| **expand** | `boolean` | Whether to expand resources referenced in the response to include additional fields | [Optional] [Defaults to `undefined`] |

### Return type

[**SkillResource**](SkillResource.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Skill updated successfully |  -  |
| **400** | Bad request |  -  |
| **401** | Unauthorized |  -  |
| **403** | Forbidden |  -  |
| **404** | Resource not found |  -  |
| **429** | Rate limit reached |  -  |
| **5XX** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

