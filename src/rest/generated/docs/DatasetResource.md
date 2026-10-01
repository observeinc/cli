
# DatasetResource

Observe Dataset with properties.

## Properties

Name | Type
------------ | -------------
`id` | string
`label` | string
`description` | string
`icon` | string
`kind` | [DatasetDatasetKind](DatasetDatasetKind.md)
`source` | string
`lastUpdateSource` | string
`fieldList` | [Array&lt;DatasetFieldDesc&gt;](DatasetFieldDesc.md)
`validFromField` | string
`validToField` | string
`labelField` | string
`primaryKey` | Array&lt;string&gt;
`candidateKeys` | Array&lt;Array&lt;string&gt;&gt;
`foreignKeys` | [Array&lt;DatasetForeignKey&gt;](DatasetForeignKey.md)
`relatedKeys` | [Array&lt;DatasetRelatedKey&gt;](DatasetRelatedKey.md)
`groupingKey` | [DatasetGroupingKey](DatasetGroupingKey.md)
`correlationTags` | [Array&lt;DatasetCorrelationTag&gt;](DatasetCorrelationTag.md)
`isSource` | boolean
`interfaces` | [Array&lt;DatasetImplementedInterface&gt;](DatasetImplementedInterface.md)
`contentType` | [DatasetContentType](DatasetContentType.md)
`customFieldMappings` | { [key: string]: Array&lt;string&gt; | undefined; }
`objectTags` | { [key: string]: Array&lt;string&gt; | undefined; }
`alignment` | [DatasetTimeAlignment](DatasetTimeAlignment.md)
`compilationError` | [DatasetCompilationError](DatasetCompilationError.md)
`managedBy` | [ObjectRef](ObjectRef.md)
`dataTableViewState` | string
`defaultDashboard` | [ObjectRef](ObjectRef.md)
`defaultInstanceDashboard` | [ObjectRef](ObjectRef.md)
`isView` | boolean
`isMonitor` | boolean
`isMetricSMA` | boolean
`accelerationType` | [DatasetAccelerationType](DatasetAccelerationType.md)
`accelerationInfo` | [DatasetAccelerationInfo](DatasetAccelerationInfo.md)
`createdBy` | [User](User.md)
`updatedBy` | [User](User.md)
`createdAt` | string
`updatedAt` | string
`storageIntegration` | [StorageIntegrationRef](StorageIntegrationRef.md)
`definitionType` | [DatasetDefinitionType](DatasetDefinitionType.md)
`score` | number


[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


