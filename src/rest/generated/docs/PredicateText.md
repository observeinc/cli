
# PredicateText

Match text against the column, or across the whole row when `FilterRule.column` is absent. `match` chooses the syntax — substring, glob, regular expression, free-text search, or token lookup — and with it the OPAL function the rule compiles to. `match` is always stored explicitly and is never guessed from the shape of the terms. 

## Properties

Name | Type
------------ | -------------
`match` | [PredicateTextMatch](PredicateTextMatch.md)
`caseSensitive` | boolean
`terms` | [Array&lt;TextMatchTermsInner&gt;](TextMatchTermsInner.md)
`paths` | [Array&lt;PredicateTextPathsInner&gt;](PredicateTextPathsInner.md)


[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


