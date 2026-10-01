
# Query

A query card: an OPAL pipeline run over one or more data inputs and rendered as a visualization. This is the default card type in both dashboards and worksheets.  A card carries either a single `visualization` or, when each expression in the query is charted separately, a `multiVisualization` array. Exactly one of the two is present. 

## Properties

Name | Type
------------ | -------------
`type` | any
`id` | string
`label` | string
`timeRange` | [FrontendTimeRange](FrontendTimeRange.md)
`content` | [CardContent](CardContent.md)
`visualization` | [Visualization](Visualization.md)
`multiVisualization` | [Array&lt;QueryMultiVisualizationInner&gt;](QueryMultiVisualizationInner.md)
`drilldowns` | [Array&lt;Drilldown&gt;](Drilldown.md)
`ui` | { [key: string]: any | undefined; }


[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


