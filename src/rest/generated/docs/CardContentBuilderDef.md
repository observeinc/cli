
# CardContentBuilderDef

State for the visual query builder. This version of the schema does not give the builder\'s expression surface a typed shape; it is carried opaquely under `ui`.  When `builderDef` is present the builder is the source of truth and `pipeline` is only a rendering of it, so clients MUST NOT edit `pipeline` directly. When `builderDef` is absent, `pipeline` is the source of truth. 

## Properties

Name | Type
------------ | -------------
`ui` | { [key: string]: any | undefined; }


[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


