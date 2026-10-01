# LoginApi

All URIs are relative to *https://OBSERVE_CUSTOMERID.observeinc.com*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**generateAPIToken**](LoginApi.md#generateapitokenoperation) | **POST** /v1/login | Generate an API token |
| [**pollDelegatedLogin**](LoginApi.md#polldelegatedlogin) | **GET** /v1/login/delegated/{serverToken} | Poll the status of a pending login request |
| [**startDelegatedLogin**](LoginApi.md#startdelegatedloginoperation) | **POST** /v1/login/delegated | Start an Observe authtoken creation flow |



## generateAPIToken

> string generateAPIToken(generateAPITokenRequest)

Generate an API token

Given an email address and a password, generate an API authorization token. This token can be used with Bearer authorization when used together with the customer ID. (The customer ID is the same as the first number in the API server URL.)  &#x60;&#x60;&#x60; Authorization: Bearer &lt;customerid&gt; &lt;apitoken&gt; &#x60;&#x60;&#x60;  Only \&quot;local\&quot; users that have a password can use this API; SSO users cannot log in using a password.  This endpoint does not itself need to Authorization header. 

### Example

```ts
import {
  Configuration,
  LoginApi,
} from '';
import type { GenerateAPITokenOperationRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new LoginApi();

  const body = {
    // GenerateAPITokenRequest | The login username and password.
    generateAPITokenRequest: {"user_email":"user@example.com","user_password":"hunter1","tokenName":"for the coin tracker integration"},
  } satisfies GenerateAPITokenOperationRequest;

  try {
    const data = await api.generateAPIToken(body);
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
| **generateAPITokenRequest** | [GenerateAPITokenRequest](GenerateAPITokenRequest.md) | The login username and password. | |

### Return type

**string**

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | ## Description of result data formats  ### Content-type: application/json The response contains an \&#39;ok\&#39; field (boolean) and an \&quot;access_key\&quot; field (string).  The \&quot;access_key\&quot; is a secret value and is as good as the password for accessing the customer instance, so treat it with care. You must remember it, because it is not stored and cannot be retrieved again, although another access key can be generated through another invocation of the API.  By default, access keys that are not used, are invalidated after about 10 days of inactivity.  |  -  |
| **400** | Invalid request. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## pollDelegatedLogin

> PollDelegatedLogin200Response pollDelegatedLogin(serverToken)

Poll the status of a pending login request

This endpoint polls the status of a pending login request. The serverToken is returned from the initial request, and is used to identify the request. 

### Example

```ts
import {
  Configuration,
  LoginApi,
} from '';
import type { PollDelegatedLoginRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new LoginApi();

  const body = {
    // string | The serverToken returned from the initial request.
    serverToken: serverToken_example,
  } satisfies PollDelegatedLoginRequest;

  try {
    const data = await api.pollDelegatedLogin(body);
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
| **serverToken** | `string` | The serverToken returned from the initial request. | [Defaults to `undefined`] |

### Return type

[**PollDelegatedLogin200Response**](PollDelegatedLogin200Response.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | The request is still pending, or has been accepted, denied, or timed out.  |  -  |
| **400** | Invalid request. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## startDelegatedLogin

> StartDelegatedLogin200Response startDelegatedLogin(startDelegatedLoginRequest)

Start an Observe authtoken creation flow

This endpoint starts an authorization flow that lets an Observe user generate an authorization token to use for external tools and scripts. This token will have the same powers as the user authorizing, and can be passed in the &#x60;Authorization: Bearer &lt;customerid&gt; &lt;apitoken&gt;&#x60; header of requqests. This endpoint will return with a URL that the user should visit in a web browser to allow the token creation; that URL will lead to a page that requires the user to be logged in (through whatever password or SSO mechanism the user normally uses.) The response from this endpoint also includes a \&quot;serverToken\&quot; field, which is a token that can be used to poll the tenant for the status of the token creation, and if successful, will return the issued access key.  Essentially, this endpoint implements the Oauth \&quot;device\&quot; authorization flow. 

### Example

```ts
import {
  Configuration,
  LoginApi,
} from '';
import type { StartDelegatedLoginOperationRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new LoginApi();

  const body = {
    // StartDelegatedLoginRequest | The credentials to authorize as.
    startDelegatedLoginRequest: {"userEmail":"user@example.com","clientToken":"ZrL5BhtFXvu2Xe78GznP1dP2Ts81ZszA","integration":"observe-tool-abdaf0"},
  } satisfies StartDelegatedLoginOperationRequest;

  try {
    const data = await api.startDelegatedLogin(body);
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
| **startDelegatedLoginRequest** | [StartDelegatedLoginRequest](StartDelegatedLoginRequest.md) | The credentials to authorize as. | |

### Return type

[**StartDelegatedLogin200Response**](StartDelegatedLogin200Response.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | This request generates a \&quot;pending\&quot; login request, which the user will have to authorize on the Observe website. Send the user to the given URL in a web browser, and then poll the API for the completion endpoint to see whether the user accepts, denies, or times out the request.  |  -  |
| **400** | Invalid request. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

