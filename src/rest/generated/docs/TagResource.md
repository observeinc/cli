
# TagResource

A tag (correlation or metric) along with every dataset that defines it. Tags are identified by `(name, kind)`; there is no ObjectId for a tag — `name` is the natural identifier within a kind. 

## Properties

Name | Type
------------ | -------------
`name` | string
`kind` | [TagKind](TagKind.md)
`datasetCount` | number
`mappings` | [Array&lt;TagMapping&gt;](TagMapping.md)
`sampleValues` | Array&lt;string&gt;


[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


