
# ApmError

APM error envelope. Extends the platform error (type + message) with a closed `type` enum (see Apm-ErrorType). On OutOfAcceleratedRange, acceleratedFrom is the recovery timestamp. 

## Properties

Name | Type
------------ | -------------
`type` | [ApmErrorType](ApmErrorType.md)
`message` | string
`acceleratedFrom` | string


[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


