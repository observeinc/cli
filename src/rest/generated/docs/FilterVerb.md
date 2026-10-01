
# FilterVerb

How the predicate is quantified over time. The default, `filter`, keeps individual matching rows and is what event data normally wants. The other verbs quantify the predicate over each interval or resource lifetime, keeping a whole interval or not at all:   - filter     — keep each matching row (default)   - ever       — the predicate matched at least once during the interval   - always     — the predicate matched for the entire interval   - never      — the predicate never matched during the interval   - filterLast — the predicate matched at the interval\'s latest point Omit for `filter`. 

## Properties

Name | Type
------------ | -------------


[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


