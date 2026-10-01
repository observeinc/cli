
# ChatResource

A chat resource - a conversation with the LLM agent.  The content of the conversation is in separate messages which can be inlined into the resource for some operations with `?expand=true`. 

## Properties

Name | Type
------------ | -------------
`id` | string
`revision` | number
`createdBy` | [User](User.md)
`createdAt` | string
`updatedBy` | [User](User.md)
`updatedAt` | string
`label` | string
`summary` | string
`activeStreamId` | string
`alert` | [ChatAlert](ChatAlert.md)
`messages` | [Array&lt;ChatFullMessage&gt;](ChatFullMessage.md)


[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


