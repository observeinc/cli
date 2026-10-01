
# ChatFullMessage

A message within a chat including the actual message \"parts\". Message parts may e.g. contain image data and be quite big, but often also just contain a text snippet. 

## Properties

Name | Type
------------ | -------------
`id` | string
`index` | number
`chatRevision` | number
`createdBy` | [User](User.md)
`createdAt` | string
`updatedBy` | [User](User.md)
`updatedAt` | string
`role` | [ChatFullMessageCreateRequestRole](ChatFullMessageCreateRequestRole.md)
`metadata` | { [key: string]: any | undefined; }
`indexedText` | string
`parts` | Array&lt;{ [key: string]: any | undefined; }&gt;


[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


