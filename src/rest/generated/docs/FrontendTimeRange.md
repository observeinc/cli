
# FrontendTimeRange

A time range, expressed in one of three ways. `kind` selects which of `preset`, `relative`, or `absolute` is present; the other two are absent.   Preset:   `{ \"kind\": \"preset\", \"preset\": { \"presetType\": \"PAST_15_MINUTES\" } }`   Relative: `{ \"kind\": \"relative\", \"relative\": { \"millisFromCurrentTime\": 900000 } }`   Absolute: `{ \"kind\": \"absolute\", \"absolute\": { \"startTime\": \"2024-04-30T00:00:00.000Z\", \"endTime\": \"2024-05-01T00:00:00.000Z\" } }` Known preset types include:   PAST_5_MINUTES, PAST_10_MINUTES, PAST_15_MINUTES,   PAST_30_MINUTES, PAST_60_MINUTES, PAST_2_HOURS,   PAST_4_HOURS, PAST_6_HOURS, PAST_12_HOURS,   PAST_24_HOURS, PAST_2_DAYS, PAST_3_DAYS, PAST_4_DAYS,   PAST_7_DAYS, PAST_14_DAYS, PAST_30_DAYS,   TODAY, YESTERDAY, THIS_DAY_LAST_WEEK, LAST_WEEK, LAST_MONTH. For presets, `millisFromCurrentTime` is derivable and is not stored. 

## Properties

Name | Type
------------ | -------------
`kind` | [FrontendTimeRangeKind](FrontendTimeRangeKind.md)
`preset` | [FrontendTimeRangePreset](FrontendTimeRangePreset.md)
`relative` | [FrontendTimeRangeRelative](FrontendTimeRangeRelative.md)
`absolute` | [FrontendTimeRangeAbsolute](FrontendTimeRangeAbsolute.md)


[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


