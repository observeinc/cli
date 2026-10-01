
# DatasetAccelerationInfo


## Properties

Name | Type
------------ | -------------
`state` | [DatasetAccelerationState](DatasetAccelerationState.md)
`stalenessSeconds` | number
`recentStalenessSeconds` | number
`stalenessReasons` | [Array&lt;DatasetStalenessReason&gt;](DatasetStalenessReason.md)
`userConfiguredTargetStalenessSeconds` | number
`targetExcludingDownstreamStalenessSeconds` | number
`effectiveTargetStalenessSeconds` | number
`rateLimitOverrideTargetStalenessSeconds` | number
`alwaysAccelerated` | boolean
`acceleratedRanges` | [Array&lt;OpenTimeRange&gt;](OpenTimeRange.md)
`targetAcceleratedRanges` | [Array&lt;OpenTimeRange&gt;](OpenTimeRange.md)
`freshnessTime` | string
`effectiveOnDemandMaterializationLengthDays` | number
`dataRetentionEnabled` | boolean
`effectiveDataRetentionPeriodDays` | number
`effectiveDataRetentionTimestamp` | string
`minimumDataTimestamp` | string
`hibernatedAt` | string
`errors` | [Array&lt;DatasetAccelerationError&gt;](DatasetAccelerationError.md)


[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


