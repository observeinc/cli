
# ApmServiceType

Role of a service-keyed row. PascalCase per style guide. Selects which `related.correlationTags.serviceName` key to filter on:  - `Service` → `service.name` - `Database` → `peer.db.name` - `Messaging` → `peer.messaging.system` - `ExternalCall` → `peer.server.address` (uninstrumented hosts)  When more than one key is present, precedence is `Service` > `Database` > `Messaging` > `ExternalCall`. When `type` is null (unknown catalog type), use `service.name`. 

## Properties

Name | Type
------------ | -------------


[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


