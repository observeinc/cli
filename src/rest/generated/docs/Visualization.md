
# Visualization

How a query card\'s results are rendered. `type` picks the chart type; `x`, `y`, and `groupBy` map result columns onto the chart\'s axes and series; `legend`, `thresholds`, and `annotations` apply to every chart type; and `options` carries the settings specific to the chosen `type`. 

## Properties

Name | Type
------------ | -------------
`type` | [VizType](VizType.md)
`x` | [FieldRef](FieldRef.md)
`y` | [Array&lt;FieldRef&gt;](FieldRef.md)
`groupBy` | Array&lt;string&gt;
`legend` | [LegendConfig](LegendConfig.md)
`thresholds` | [Array&lt;Threshold&gt;](Threshold.md)
`annotations` | [Array&lt;Annotation&gt;](Annotation.md)
`tableConfig` | [TableConfig](TableConfig.md)
`options` | [VisualizationOptions](VisualizationOptions.md)


[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


