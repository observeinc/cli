
# ApmInvocationGraphResponse

The service dependency graph for the requested scope. `interval` echoes the resolved query window, `services` lists every service in the graph, and `invocations` lists the calls between them. A service that is never the `target` of a call is a root. 

## Properties

Name | Type
------------ | -------------
`interval` | [ApmInterval](ApmInterval.md)
`services` | [Array&lt;ApmService&gt;](ApmService.md)
`invocations` | [Array&lt;ApmServiceInvocation&gt;](ApmServiceInvocation.md)


[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


