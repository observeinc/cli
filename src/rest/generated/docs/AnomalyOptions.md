
# AnomalyOptions

Settings for the anomaly chart: which column marks anomalous points, which one separates the series, and how the two axes are drawn.  This chart type is read-only. The product has no editor for it, and only the monitor view produces one. Preserve these settings when updating a dashboard that already has one, but do not author them. 

## Properties

Name | Type
------------ | -------------
`redPointField` | [FieldRef](FieldRef.md)
`seriesField` | [FieldRef](FieldRef.md)
`xConfig` | [AxisConfig](AxisConfig.md)
`yConfig` | [AxisConfig](AxisConfig.md)
`curve` | [LineCurveType](LineCurveType.md)
`extensions` | { [key: string]: any | undefined; }


[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


