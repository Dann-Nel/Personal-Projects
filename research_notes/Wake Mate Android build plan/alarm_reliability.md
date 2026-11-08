# Android alarm-clock reliability for Wake Mate (Expo SDK 58, RN 0.88) — research as of 2026-11-08

Scope: Android 12-16 only. "UNVERIFIED" marks claims I could not confirm from a fetched source. Effort estimates are my own judgement, not sourced.

## 1. AlarmManager APIs, exact-alarm permissions, Play policy, full-screen intent

### Takeaway
For a wake-up alarm, `setAlarmClock()` is the strongest API: the system never adjusts its delivery time and leaves low-power modes to deliver it. It needs `SCHEDULE_EXACT_ALARM` (user-granted) or `USE_EXACT_ALARM` (auto-granted, Play-restricted to alarm/timer/calendar apps, which Wake Mate qualifies for). `USE_FULL_SCREEN_INTENT` is likewise auto-grantable only to core alarm/calling apps, via a Play Console declaration.

### Cited Findings
- Inexact alarms (`set`, `setAndAllowWhileIdle`, `setInexactRepeating`) never fire early, but on Android 12+ may fire up to one hour late; `setWindow` windows are clipped to a minimum of ~10 min. — [Android alarms guide](https://developer.android.com/develop/background-work/services/alarms)
- Exact methods are ordered by criticality: `setExact` < `setExactAndAllowWhileIdle` (fires even under battery-saving measures) < `setAlarmClock` ("the system never adjusts their delivery time… leaves low-power modes if necessary to deliver the alarms"). — [Android alarms guide](https://developer.android.com/develop/background-work/services/alarms)
- All three exact methods throw `SecurityException` without `SCHEDULE_EXACT_ALARM` (or `USE_EXACT_ALARM`) on apps targeting 12+. — [Android 14 exact alarm changes](https://developer.android.com/about/versions/14/changes/schedule-exact-alarms); [alarms guide](https://developer.android.com/develop/background-work/services/alarms)
- Since Android 14, `SCHEDULE_EXACT_ALARM` is denied by default for new installs targeting 13+, but alarm-clock and calendar apps "should declare USE_EXACT_ALARM", which is granted on install and cannot be revoked by the user. — [Android 14 changes](https://developer.android.com/about/versions/14/changes/schedule-exact-alarms); [alarms guide](https://developer.android.com/develop/background-work/services/alarms)
- Revoking `SCHEDULE_EXACT_ALARM` stops the app and cancels all future exact alarms; after the user grants it, the system sends `ACTION_SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED` and the app must reschedule (same logic as on boot). Check `canScheduleExactAlarms()` and send users to `ACTION_REQUEST_SCHEDULE_EXACT_ALARM`. — [alarms guide](https://developer.android.com/develop/background-work/services/alarms)
- Alarms are cleared on device shutdown/reboot; you must reschedule on `BOOT_COMPLETED` (requires `RECEIVE_BOOT_COMPLETED`, and only works after the user has launched the app once). — [alarms guide](https://developer.android.com/develop/background-work/services/alarms)
- Repeating alarms are all inexact on API 19+, so a "daily exact" alarm must be re-armed one-shot each time it fires. — [alarms guide](https://developer.android.com/develop/background-work/services/alarms)
- Google Play: `USE_EXACT_ALARM` may be declared only if precisely timed actions are core, user-facing functionality (alarm/timer apps, calendar apps with event notifications); requires the Play Console declaration form; non-qualifying apps are disallowed from publishing. — [Play permissions policy](https://support.google.com/googleplay/android-developer/answer/9888170); [Play help 13161072](https://support.google.com/googleplay/android-developer/answer/13161072)
- `USE_FULL_SCREEN_INTENT` (target 14+) is auto-granted only to apps whose core function is setting alarms or phone/video calls; others must ask the user. Targeting 14+ apps should submit the Play Console declaration to establish pre-grant eligibility. — [Play permissions policy](https://support.google.com/googleplay/android-developer/answer/9888170)
- AOSP: on Android 14 other apps get FSI enabled at install and the Play Store then revokes it; check via `NotificationManager#canUseFullScreenIntent()`, request via `ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT`. If denied, the alert is a heads-up notification (60 s) rather than launching the full-screen activity. — [AOSP FSI limits](https://source.android.com/docs/core/permissions/fsi-limits)
- Exact alarms are exempt from foreground-service background-start restrictions ("Your app invokes an exact alarm to complete an action that the user requests"); also exempt: apps with battery optimization disabled, BOOT_COMPLETED receivers (with Android 14/15 type restrictions). — [FGS background-start restrictions](https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start)
- Doze defers ordinary alarms; exact alarms are listed as a way to work during Doze. — [alarms guide](https://developer.android.com/develop/background-work/services/alarms)

### Inferences
- Wake Mate should use `setAlarmClock` + `USE_EXACT_ALARM` (declare it, complete the Play form citing "alarm clock" as core function). Keep `SCHEDULE_EXACT_ALARM` only as a fallback if you worry about review; declaring both (as app.json does today) is allowed by the docs but redundant. UNVERIFIED: whether Play reviewers object to declaring both.
- Because the exact-alarm exemption lets a receiver start a foreground service from the background, the "alarm fires -> start FGS that loops audio" design is permitted on 12+. UNVERIFIED for the specific `mediaPlayback` FGS type on Android 14-16 (not fetched; check the FGS service-type page and Android 15/16 behavior-change pages).
- Daily repeat requires re-scheduling the next day's alarm when the current one fires (and on boot / time-zone / time change / permission-state change).

### Gaps
- Play Console declaration form exact wording and review turnaround: not found.
- Android 16 (API 36) specific changes to alarms/FSI/FGS: not fetched; UNVERIFIED that nothing new applies.
- Android 15's `BOOT_COMPLETED` FGS-type restrictions (page only linked): not read.
- The Play-policy fetches reported no enforcement dates for these sections.

## 2. OEM battery restrictions and in-app guidance

### Takeaway
Huawei, Xiaomi, OnePlus and Samsung are rated worst (5/5) on dontkillmyapp.com; fixes are user-side settings (autostart, unrestricted battery, never-sleeping lists), and the site states no developer-side fix exists for Samsung. In-app guidance should be a setup checklist with deep links plus a self-test alarm.

### Cited Findings
- dontkillmyapp.com ranks Huawei (5), Xiaomi (5), OnePlus (5), Samsung (5), Oppo (4), Vivo (3); developers can report device-specific issues to Google's IssueTracker; users can run the DontKillMyApp benchmark app. — [dontkillmyapp.com](https://dontkillmyapp.com)
- Xiaomi/MIUI: non-standard limits with "no APIs and no documentation"; user fixes: lock app in recents, enable Autostart (Settings > Apps > app > permissions > Background autostart on MIUI 14), battery saver "no restrictions", disable "MIUI Optimizations"; developers can use the open-source MIUI-autostart library to detect autostart state on MIUI 10-14 (throws on non-MIUI). — [dontkillmyapp.com/xiaomi](https://dontkillmyapp.com/xiaomi)
- Samsung: apps unused ~3 days go to "Sleeping/Deep sleeping apps" and lose background processing; alarms can fail if the app is unused over several days (e.g., a weekend). Fixes: disable "Put unused apps to sleep", turn off battery optimization for the app, check "Alarms & reminders" on Android 13; on Android 13 "Lock Recent App" and some optimize options are gone; settings may be re-applied after updates; "No known solution on dev end". — [dontkillmyapp.com/samsung](https://dontkillmyapp.com/samsung)
- Samsung 2023 statement: FGS for apps targeting Android 14 should work as intended on One UI 6.0+ if they follow Android's FGS policy. — [dontkillmyapp.com/samsung](https://dontkillmyapp.com/samsung)
- Alarmy (competitor) support tells Pixel users to exclude it from battery optimization, enable background usage, and avoid memory-clean/"free memory" routines, which can stop alarms. — [Alarmy Android help, Pixel](https://alarmy-android.zendesk.com/hc/en-us/articles/4596334836505--Google-Pixel)
- Exact alarm exemptions include apps the user has exempted from battery optimization (power allowlist, `ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`). — [Android 14 changes](https://developer.android.com/about/versions/14/changes/schedule-exact-alarms)

### Inferences
- A force-stop or OEM "kill" can remove pending alarms on some skins; since `setAlarmClock` is registered with the system service it usually survives swipe-away, but behavior on MIUI/EMUI varies. UNVERIFIED for specific devices; budget for real-device testing (Xiaomi, Samsung, Pixel minimum).
- Onboarding checklist for phase 1: (1) notifications allowed, (2) exact-alarm/alarms & reminders allowed (if not using USE_EXACT_ALARM), (3) full-screen intent allowed, (4) battery "Unrestricted"/ignore-optimizations, (5) OEM-specific autostart/never-sleeping pointer by `Build.MANUFACTURER`, (6) "test alarm in 1 minute" with screen off.

### Gaps
- Huawei, OnePlus, Oppo, Vivo per-vendor pages were not fetched; no concrete steps recorded.
- Android 14-16 per-OEM changes (HyperOS, One UI 7/8) not verified.
- Which settings intents (e.g., `ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS`) are Play-policy safe: not researched (note `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` has its own Play policy; UNVERIFIED here).

## 3. Options in Expo and existing libraries

### Takeaway
expo-notifications (SDK 58 docs, v58.0.0) already supports `delivery: 'alarmClock'` (uses `setAlarmClock`) and exposes `AndroidAudioUsage.ALARM`, which gets the app 80% to "fires on time with a status-bar alarm icon". It documents no full-screen intent, no looping audio/foreground service, and no reboot guarantees, so a custom native piece is needed for a truly Alarmy-grade ring. Candidate third-party libraries are archived, iOS-only, or immature.

### Cited Findings
- expo-notifications `NotificationDelivery` (Android): `'bestEffort'` (default; `setExactAndAllowWhileIdle`, OEMs may defer by minutes) and `'alarmClock'` (`setAlarmClock`, not deferred, status-bar alarm icon, needs `SCHEDULE_EXACT_ALARM` or `USE_EXACT_ALARM` on Android 12+, silently falls back to `bestEffort` without it). — [Expo Notifications reference](https://docs.expo.dev/versions/latest/sdk/notifications/)
- The same docs: `getExactAlarmPermissionsAsync` / `requestExactAlarmPermissionsAsync` (the latter requires `SCHEDULE_EXACT_ALARM` declared); the config plugin does not add exact-alarm permissions, declare via `android.permissions`; `RECEIVE_BOOT_COMPLETED` is added by the library manifest. — [Expo Notifications reference](https://docs.expo.dev/versions/latest/sdk/notifications/)
- Channel options include `audioAttributes` (with `usage`, `AndroidAudioUsage.ALARM = 4`), `bypassDnd`, `sound`, `importance`; after creation only name/description can change. — [Expo Notifications reference](https://docs.expo.dev/versions/latest/sdk/notifications/)
- The fetched docs text did not mention foreground service, full-screen intents, or reboot/force-stop behavior. — [Expo Notifications reference](https://docs.expo.dev/versions/latest/sdk/notifications/)
- Conflicting detail: one extraction said `delivery` is on Date/Daily/Monthly triggers (default `bestEffort`), another said Weekly/Yearly; verify the exact type for `DAILY` in installed `expo-notifications` typings. — [Expo Notifications reference](https://docs.expo.dev/versions/latest/sdk/notifications/)
- `react-native-alarm-module` (jd1378): archived 16 Apr 2023, "NO LONGER GETTING UPDATES, Do not use"; runs headless JS; can't launch app from background on newer Android; alarms not restored after reboot. — [GitHub](https://github.com/jd1378/react-native-alarm-module)
- Notifee (invertase): archived 7 Apr 2026, "no longer actively maintained"; maintainers recommend expo-notifications, and name `react-native-notify-kit` as a community drop-in fork. — [GitHub](https://github.com/invertase/notifee)
- `react-native-alarm-scheduler` v0.1.7 (pkgstats listing): uses `setAlarmClock` on Android, has an Expo config plugin (`addExactAlarmPermission` option), AlarmKit on iOS 26+. Early-stage version; maintenance and SDK 58 compatibility not confirmed. — [pkgstats](https://www.pkgstats.com/pkg:react-native-alarm-scheduler)
- `expo-alarm-module` exists on npm (v1.2.0 README indexed); npmjs.com returned 403, so status unconfirmed. — [jsDelivr README](https://cdn.jsdelivr.net/npm/expo-alarm-module@1.2.0/README.md)
- Expo forum threads historically say alarms need native code beyond Expo Go. — [Expo forums](https://forums.expo.dev/t/implementing-alarms-with-expo/5001) (old; may be outdated)

### Inferences
- Current `src/lib/alarm.ts` uses a `DAILY` trigger with default delivery (`bestEffort`) on a MAX-importance channel with `sound: 'default'`: it posts a normal notification with the default notification sound (short, not alarm stream, not looping, silenced by DND, no full-screen takeover). Minimal fix: add `delivery: 'alarmClock'` if typed for the trigger, set channel `audioAttributes.usage = ALARM`, a long custom alarm sound file, `bypassDnd`, and remove the blanket `cancelAllScheduledNotificationsAsync` side effects. UNVERIFIED that notification sound is capped; Android notification sounds typically play once for their file length (a long tone file can approximate a ring).
- The Android `INSISTENT` flag (loop sound) is not exposed in the documented expo-notifications API (UNVERIFIED), so true looping needs native code.
- Because notifee is archived and the Expo team points to expo-notifications, third-party notification libraries are a poor bet; a small in-repo Expo module (Kotlin) is the lowest-risk way to get FSI + looping audio.
- No library found that is confirmed maintained, Android-14+-correct, and SDK 58-compatible for full alarm UX. UNVERIFIED search was shallow (few queries).

### Gaps
- Whether expo-notifications has an API for `fullScreenIntent` or `INSISTENT` (docs fetched did not show it; read the first/last 23k chars not fully inspected for notification content fields).
- npm/GitHub activity for `react-native-notify-kit`, `react-native-alarm-scheduler`, `expo-alarm-module`: not checked.
- Expo SDK 58 config-plugin/local-module docs (expo-modules-api) not fetched.
- How Alarmy, Sleep as Android, Google Clock are built internally: no authoritative source found. Commonly understood pattern (UNVERIFIED here): `setAlarmClock` -> broadcast receiver -> foreground service playing audio on `USAGE_ALARM` + full-screen-intent notification launching a lock-screen activity (`setShowWhenLocked`/`setTurnScreenOn`), plus boot/time-change receivers. Alarmy docs confirm only battery-optimization exclusion guidance.

## 4. Recommended path (effort = my estimates, UNVERIFIED)

### Takeaway
Phase 1 (about 1-2 dev days): configure expo-notifications to ring via `alarmClock` delivery with correct permissions and an onboarding reliability checklist. Phase 2 (about 1-2 weeks incl. device testing): local Expo native module for the receiver, foreground service with looping `USAGE_ALARM` audio, full-screen alarm activity, and robust rescheduling.

### Cited Findings
- Phase 1 building blocks exist in expo-notifications SDK 58: `delivery: 'alarmClock'`, exact-alarm permission helpers, `AndroidAudioUsage.ALARM`, `bypassDnd`. — [Expo Notifications reference](https://docs.expo.dev/versions/latest/sdk/notifications/)
- Phase 2 building blocks are platform-permitted: exact alarms can start FGS from background; `USE_EXACT_ALARM` and FSI are pre-grantable to alarm apps via Play declaration; reboot rescheduling via `BOOT_COMPLETED`. — [FGS restrictions](https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start); [Play policy](https://support.google.com/googleplay/android-developer/answer/9888170); [alarms guide](https://developer.android.com/develop/background-work/services/alarms)

### Inferences
- Phase 1 (minimal):
  1. app.json: keep `USE_EXACT_ALARM` (+ optional `SCHEDULE_EXACT_ALARM`), add `USE_FULL_SCREEN_INTENT`, `WAKE_LOCK` if needed; keep `RECEIVE_BOOT_COMPLETED`.
  2. alarm.ts: `delivery: 'alarmClock'`; channel with `audioAttributes.usage: ALARM`, bundled long alarm tone via expo-notifications `sounds` config, `bypassDnd: true` (needs user DND access, UNVERIFIED), call `getExactAlarmPermissionsAsync`.
  3. Don't cancel all notifications; track the alarm ID. Prefer one-shot DATE triggers re-armed on app open/notification receipt if DAILY semantics prove inexact (UNVERIFIED).
  4. Onboarding "Reliability check" screen with deep links (battery, FSI, exact alarms, OEM autostart) and a test alarm.
  5. Submit Play declarations (USE_EXACT_ALARM, full-screen intent) before release.
  Limits: single notification sound (no loop), may only show a heads-up on lock screen unless FSI wired, JS not guaranteed to run when app killed.
- Phase 2 (full): custom config plugin + local Expo module: `AlarmManager.setAlarmClock` with own PendingIntent -> `BroadcastReceiver` -> foreground service (MediaPlayer/ExoPlayer, `USAGE_ALARM`, volume ramp, vibration) + FSI notification -> `AlarmActivity` (`setShowWhenLocked(true)`, `setTurnScreenOn(true)`, keyguard dismiss) with snooze/dismiss; receivers for `BOOT_COMPLETED`, `TIME_SET`, `TIMEZONE_CHANGED`, `MY_PACKAGE_REPLACED`, `ACTION_SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED`; persist alarms in SharedPreferences/Room; re-arm next day's alarm on fire; FGS type declaration and timeout handling for Android 14-16 (UNVERIFIED specifics). Add Sentry/telemetry for "alarm scheduled vs alarm fired" to catch OEM kills.
- Decision rule: ship Phase 1 for internal testing; promote to Phase 2 if test alarm fails on any target OEM or a single-tone notification is not loud/persistent enough.

### Gaps
- Effort estimates are judgement, not sourced.
- No benchmark data on real-device success rates for `alarmClock` delivery vs custom FGS path.
