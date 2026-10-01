
# MetricResource

A metric resource. Metrics do not have a globally unique ObjectId — they are identified by the tuple (dataset.id, name). 

## Properties

Name | Type
------------ | -------------
`name` | string
`dataset` | [DatasetRef](DatasetRef.md)
`type` | [MetricType](MetricType.md)
`unit` | string
`description` | string
`rollup` | string
`aggregate` | string
`intervalMillis` | number
`suggestedBucketSizeMillis` | number
`userDefined` | boolean
`status` | [MetricStatus](MetricStatus.md)
`lastReported` | string
`pointCount` | number
`cardinality` | number
`linkLabels` | Array&lt;string&gt;
`metricTags` | [Array&lt;DatasetFieldPath&gt;](DatasetFieldPath.md)
`correlationTags` | [Array&lt;DatasetCorrelationTag&gt;](DatasetCorrelationTag.md)


[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


