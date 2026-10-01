
# DatasetAccelerationState

The state of the dataset\'s acceleration. Initializing: The dataset is newly created/updated and acceleration has just started. Accelerated: The dataset is accelerated and available for querying. AcceleratedImmediately: The dataset is accelerated and available for querying. The dataset is also in \"live mode\", meaning it is being updated as fast as possible. Unavailable: The dataset is not accelerated and is not available for querying due to a compilation error in the dataset or upstream. Disabled: The dataset is not accelerated and is available for querying due to user disablement. (e.g. dataset is a view) Error: The dataset is not accelerated and may return outdated results due to a critical error. 

## Properties

Name | Type
------------ | -------------


[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


