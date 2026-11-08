# expo-notifications (pinned reference)

Pinned: `expo` ~58.0.23, `expo-notifications` 58.1.8. Last verified: 2026-11-08, against the installed
TypeScript types in `node_modules/expo-notifications/build/` (not just the web docs).

| API | Verified signature / behaviour |
|---|---|
| Handler fields | `shouldShowBanner`, `shouldShowList`, `shouldPlaySound`, `shouldSetBadge` (`shouldShowAlert` is deprecated) |
| `DailyTriggerInput` | `{ type: SchedulableTriggerInputTypes.DAILY, hour, minute, channelId?, delivery?: 'bestEffort' \| 'alarmClock' }`; default delivery is `bestEffort` |
| `delivery: 'alarmClock'` | Uses `AlarmManager.setAlarmClock`; not deferred by battery optimisation. Falls back to `bestEffort` without exact-alarm permission |
| `scheduleNotificationAsync` | Returns `Promise<string>` (the identifier); accepts `identifier` in the request |
| `cancelScheduledNotificationAsync(identifier)` | Cancels one scheduled notification |
| `getExactAlarmPermissionsAsync()` / `requestExactAlarmPermissionsAsync()` | Return `PermissionResponse`. Request **rejects if `SCHEDULE_EXACT_ALARM` is not declared** in `app.json`. Android 14+ denies `SCHEDULE_EXACT_ALARM` by default; `USE_EXACT_ALARM` is auto-granted |
| Channels | `setNotificationChannelAsync(id, { name, importance, audioAttributes?, sound?: string \| null, ... })`. Immutable after creation (except name/description), so change the id to change behaviour |
| `RECEIVE_BOOT_COMPLETED` | Added automatically by the library; do not declare it |

Not found in the installed types or the docs read: full-screen intents, looping alarm audio, a guarantee about
re-arming daily alarms after reboot or time-zone change. These need a native module (see the README roadmap).

Unverified: Google Play policy text for `USE_EXACT_ALARM` / `USE_FULL_SCREEN_INTENT` declarations.
