
# FieldRef

Reference to a column / field. The `column` variant is a plain column id; the others cover nested paths, correlation tags, link/resource source fields, and primary keys. 

## Properties

Name | Type
------------ | -------------
`type` | [FieldRefType](FieldRefType.md)
`column` | string
`nested` | [FieldRefNested](FieldRefNested.md)
`tag` | [FieldRefTag](FieldRefTag.md)
`link` | [FieldRefLink](FieldRefLink.md)
`primaryKey` | [FieldRefPrimaryKey](FieldRefPrimaryKey.md)


[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


