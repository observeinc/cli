
# ApmErrorType

Stable, machine-readable APM error category.  - `BadRequest`: the request is malformed or otherwise the caller\'s   doing (inverted time window, canceled request, invalid filter). - `RequiredParamMissing`: a required parameter was omitted or passed   empty. - `InvalidTimestamp`: a time bound is not a valid RFC3339 timestamp. - `OutOfAcceleratedRange`: the requested window starts before this   account\'s accelerated telemetry is available. `acceleratedFrom` is   the earliest recoverable timestamp. - `NotConfigured`: an account/config state, not a malformed request   and not a server fault. The tracing-content dataset an APM read   needs has not been installed (or has not yet been discovered) for   this account. Retrying will not help until that dataset exists. - `PayloadTooLarge`: the result exceeds a server-enforced size cap   (for example the invocation graph\'s edge limit). Narrow the window   or supply a focal identity. - `TimedOut`: the query exceeded its time budget. - `InternalError`: an unexpected server failure. 

## Properties

Name | Type
------------ | -------------


[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


