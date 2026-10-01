
# DatasetStalenessReason

A reason explaining why a dataset\'s freshness is what it is. ConfiguredFreshnessGoal: The data meets the freshness goal set for this dataset, but that goal is loose enough to allow this staleness; set a tighter goal for fresher data. CreditManagerOverride: The acceleration credit manager raised the freshness goal to keep acceleration cost down. SlowAcceleration: Acceleration can\'t keep up with the freshness goal; optimizing the dataset\'s query or reducing its data volume can help. ActiveBackfill: A backfill is accelerating historical data, which can reduce freshness until it finishes. DatasetHibernated: Ongoing acceleration is suspended because the dataset is hibernated; querying it resumes acceleration. UnusedDatasetHibernating: The freshness goal was relaxed because the dataset hasn\'t been queried recently; querying it restores the configured goal. 

## Properties

Name | Type
------------ | -------------


[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


