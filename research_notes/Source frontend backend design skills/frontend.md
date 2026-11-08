# zizi-skills:frontend applied to Wake Mate mobile UI (Expo SDK 58, RN 0.88, Android, dark)

Method note: skill file and app files read directly. Wake Mate versions confirmed from package.json: expo ~58.0.23, react-native 0.88.1, react 19.3.0, react-native-safe-area-context ~5.11.1, expo-router ~58.0.30. Contrast ratios below were computed by me (WCAG luminance formula) from the hex values in index.tsx, not taken from a source.

## 1. What does the frontend skill instruct, and which rules apply to React Native vs web only?

### Takeaway
The skill is a Vue 3 + Tabler web skill whose universal parts are: route to reference files first, mirror the codebase, always build loading/empty/error states, and verify in both themes with screenshots. Most of the reactivity traps, PurgeCSS, SSR, vitest and Tabler content is web/Vue-only; only the UX-states rule, the "form usable not just rendered" rule, remount safety, the aggregate-from-source rule and the failure modes about swallowed errors transfer to RN.

### Cited Findings
- Stated goal: "build well-structured, performant, good-UX frontends, and learn the user's preferences (component styles, layouts, patterns) over time." Description scope: components, state, typed service layer, lists/tables/filters, forms, modals, loading/empty/error states, routing, SSR, web performance; "Vue 3 + Tabler today, framework-agnostic in approach." — [SKILL.md](file:///root/.claude/plugins/synced/f69a9f57-eaea-4da2-896d-07c7681a5ac0_b37344c7-d43a-4ccd-837a-bab3456b4bb6/11922719-c2b0-4b58-9751-2dd37b3f91f9/skills/frontend/SKILL.md)
- Step 1: read the routed reference file first (list/table, architecture/service layer, SSR, public-site checklist, forms-and-overlays, UI/UX, web-performance, other-stacks, i18n). Quote: "reading the wrong-or-no file is how established conventions get reinvented badly." Note: the referenced files (LEARNINGS.md, LOCAL.md, forms-and-overlays.md, other-stacks.md) are not part of what I read; only SKILL.md was read, so their content is not covered here. — SKILL.md (same path)
- Step 2: "mirror the codebase before inventing... The bar is 'indistinguishable from the code around it'". — SKILL.md
- Step 3 (the only structuring rule): "loading, empty, AND error states for every async surface (the error branch is the one that gets forgotten...); inline validation feedback; don't block the whole view on one slow call." — SKILL.md
- Step 4 hard gates: (1) light AND dark mode; (2) verify built output when classes are composed dynamically (PurgeCSS); (3) "Show the UI as inline screenshots"; (4) lint + build, no new vue-tsc errors; (5) parallel vitest as CI; (6) "'The page renders' is not evidence a FORM is usable"; (7) a CSS fix that "looks right" is unverified, A/B against the DOM. — SKILL.md
- Reactivity/layout traps: remount-safe post-auth pages ("Assume any post-auth view mounts more than once"); aggregates must not derive from the loaded page; Vue `immediate: true` watcher TDZ; `v-model` number auto-cast; money formatter `-0`; Vue scoped CSS reaching child root; flex/grid `min-width: auto` ("Set `min-width: 0`"); stubbed Teleport. — SKILL.md
- Failure modes: hand-rolled table; value-importing backend shared enums; testing only light/dev; `.filter(item => item.condition)` on function reference; "Skipping loading/error branches on a new fetch — a swallowed failure renders a misleading 'no data' empty state"; `wrapper.get().exists()`; deriving a landing page from highest role; unlabelled multi-tenant data. — SKILL.md
- Done checklist: read reference + matched convention; loading+empty+error states; BOTH light and dark; built-output check if dynamic classes; inline screenshots; lint+build green, no new type errors. — SKILL.md
- Related skills: plain-language (words in empty/loading/error states and labels), code-quality (one responsibility per file, readable by a junior, one rhythm per screen kind). — SKILL.md

Applicability triage (my classification):
- Applies to RN as written: states rule (loading/empty/error), inline validation, "don't block the whole view on one slow call", swallowed-failure-as-empty-state, remount safety (Expo Router screens can remount, e.g. on auth/route changes), aggregates from source, "render != usable, exercise interaction", mirror the codebase, plain-language labels, code-quality one-responsibility-per-file, lint + typecheck gate (map vue-tsc to `tsc --noEmit` + `expo lint`, which AGENTS.md also requires).
- Applies with translation: "light AND dark" -> app is dark-only (`userInterfaceStyle: "dark"`), so the equivalent gate is dark at multiple font scales and display sizes; "inline screenshots" -> emulator/device screenshots; flex `min-width:0` trap -> RN flex has `minWidth: 0` too for long text in rows.
- Web/Vue-only (ignore): Tabler/tabler-ui, PurgeCSS/dynamic class check, SSR/public pages/SEO/sitemap/JSON-LD, Lighthouse, Vue reactivity traps (v-model, immediate watcher, scoped CSS, Teleport), vitest barrel cycle, `wrapper.get().exists()`, shared-types decorator metadata, data-table component, role-based landing page, multi-tenant label.
- Gap in skill: no mobile/Android content at all (no a11y, safe area, back handling, touch targets); its `other-stacks.md` (R/Shiny example) would be the place to add RN notes.

### Inferences
- Wake Mate is a poor fit for the skill's concrete content but a good fit for its two core gates (states + usability verification). The skill's own Step 4 item 6 implies the app should be exercised on a device, not only type-checked.

### Gaps
- LEARNINGS.md, LOCAL.md and the project reference files were not read (task named only SKILL.md); there may be extra conventions there.

## 2. Audit of src/app/index.tsx and _layout.tsx

### Takeaway
Biggest issues: (a) the secondary "Turn alarm off" button is dark text on #3a3470 at about 1.66:1 contrast (fails), (b) the alarm is a plain notification, not a ringing alarm screen, with no snooze/dismiss, (c) deprecated RN `SafeAreaView`, (d) no accessibility semantics, (e) swallowed errors/no loading/error/offline states, (f) 190 lines of mixed state, I/O and UI in one file.

### Cited Findings (external facts used for the audit)
- RN `SafeAreaView` is deprecated: "Deprecated. Use react-native-safe-area-context instead." — [reactnative.dev SafeAreaView](https://reactnative.dev/docs/safeareaview)
- Expo's safe-area-context page: `SafeAreaView` is "a regular View component with the safe area edges applied as padding"; Expo Router sets up the provider automatically, otherwise add `SafeAreaProvider` at the root; `useSafeAreaInsets` is for finer control and the page says it may be slower than `SafeAreaView` on rotation. Page did not mention edge-to-edge or RN SafeAreaView deprecation. — [Expo SDK 58 safe-area-context](https://docs.expo.dev/versions/v58.0.0/sdk/safe-area-context/)
- Expo system bars guide: "Now, with edge-to-edge on Android, you will need to use safe areas to ensure that content does not overlap with system bars." — [Expo system bars](https://docs.expo.dev/develop/user-interface/system-bars/)
- `android.predictiveBackGestureEnabled` "Enable your app to use the predictive back gesture on Android 13 (API level 33) and later," default false. Wake Mate sets it false explicitly. — [Expo app config v58](https://docs.expo.dev/versions/v58.0.0/config/app/)
- Touch target: "we recommend that each interactive UI element have a focusable area, or touch target size, of at least 48dpx48dp." — [Android: Make apps more accessible](https://developer.android.com/guide/topics/ui/accessibility/apps)
- Contrast: text smaller than 18sp (or bold below 14sp) needs at least 4.5:1; other text at least 3:1. — same Android page
- Descriptions: "Avoid redundancies... make the button's description 'Submit', not 'Submit button'"; use role to expose type; unique descriptions; decorative elements hidden. — same Android page
- Use cues beyond color; label elements; merge related group into one announcement; give custom actions for gesture-only flows. — [Android a11y principles](https://developer.android.com/guide/topics/ui/accessibility/principles)
- RN accessibility props: `role` "communicates the purpose of a component and has precedence over the accessibilityRole prop"; `accessibilityLabel` defaults to concatenated child text; `accessibilityState` supports `disabled`, `selected`, `checked`, `busy`, `expanded`; `accessibilityLiveRegion` (Android) `polite`/`assertive`. — [RN accessibility](https://reactnative.dev/docs/accessibility). The page does not cover touch target size.
- Text scaling: `allowFontScaling` defaults to true; `maxFontSizeMultiplier` caps the scale (0 = no max). — [RN Text](https://reactnative.dev/docs/text)

### Findings per area (audit of code; line refs to index.tsx)
Accessibility
- No `role`, `accessibilityLabel`, `accessibilityState` anywhere. `Pressable` clock (l.129) reads as concatenated text "07:00 Tap to set..." with no button role. Disabled "You're up" button (l.154) sets `disabled` but no `accessibilityState`. "Block / report" (l.158) is a bare text Pressable with no role and a tap area of one text line (about 20dp, below 48dp).
- Touch targets: `btn` padding 16 + 16sp text is about 52dp (OK). The link is not.
- Contrast (computed): sub #b9b4e0 on #14112b 9.32:1 OK; hint on clock 7.12 OK; primary button text #14112b on #f59e6b 8.72 OK; cardText 11.31 OK; warn 11.59 OK; white on clock 14.02 OK. FAIL: `btnText` (#14112b) on `ghost` (#3a3470) = 1.66:1 for the "Turn alarm off" button (l.135 with styles l.183/185). Also card (#1f1b43) vs screen bg (#14112b) is 1.13:1, so the card boundary is nearly invisible (not a text failure, but WCAG non-text 3:1 applies to control boundaries, not to decorative cards).
- Color-only cue: "You're up ✓" vs "I'm up!" differ by text, fine. Emoji (🎉, ✓, ☀️) are announced literally by TalkBack; mark decorative or remove.
- Dynamic font: Text scales by default (good), but 72 fixed time text with `fontSize: 72` and `paddingVertical: 36` may overflow at 200% (about 144sp wide for "07:00" on ~360dp screen = likely clipped/wrapped). Cap with `maxFontSizeMultiplier` only on the clock, keep others scalable. Screen is not scrollable, so at large font scale the card and buttons can be pushed off-screen: needs ScrollView.
- Status text changes (mate woke up) are not announced: add `accessibilityLiveRegion="polite"`.
States
- Loading: AsyncStorage read has no loading state, so first paint flashes the default 07:00/off before stored alarm hydrates (l.47-50); "Finding your mate…" is the only loading text.
- Error: `refreshMatch` swallows errors ("offline: keep what we have", l.43), `imUp` swallows (`.catch(() => undefined)` l.108), `leaveMatch` swallowed, `blockAndReport` has no catch. The skill's exact failure mode: swallowed failure renders misleading state. A failed `markAwake` looks like nothing happened; a failed join shows "Finding your mate…" forever.
- Offline: no indicator; polling every 5s (l.57) keeps firing on failure without backoff and runs while backgrounded unless app state is checked; also polls for the whole time the alarm is on, not just while a match exists.
- Empty/not configured: handled with a warn text, but it is dev-facing copy ("Copy .env.example...") shown to end users.
- Optimistic/duplicate: `busy` set only in `enable`, `imUp` has no busy guard, so double-tap fires twice.
- Alarm-on, permission denied: Alert only; no persistent state or deep link to settings. Exact-alarm permission is declared (SCHEDULE_EXACT_ALARM and USE_EXACT_ALARM both) but UI never checks `getExactAlarmPermissionsAsync`.
SafeArea / edge-to-edge / back
- Uses deprecated `SafeAreaView` from `react-native` (l.7, 125). Replace with `react-native-safe-area-context` (already a dependency, ~5.11.1).
- `title` has `marginTop: 24` on top of the inset, fine but arbitrary.
- `StatusBar style="light"` correct for dark UI. Navigation bar (3-button/gesture) overlap: not handled; with edge-to-edge, bottom content needs bottom inset, which `SafeAreaView` default edges cover but a `ScrollView` or footer would need `useSafeAreaInsets`.
- Back: single-screen Stack, so back exits the app; fine. `predictiveBackGestureEnabled: false` explicit; acceptable, but no back handling is needed until a ringing screen/modal route exists. If a ringing route is added, it must intercept hardware back (BackHandler) so back does not silently dismiss.
- _layout: `contentStyle` hardcodes #14112b; theme colors duplicated as hex across both files. No `ThemeProvider`/navigation theme, so any future header/modal flashes default light theme.
Structure
- One 190-line file mixes persistence (AsyncStorage), polling, permissions, scheduling, matching, Alerts and UI. Against code-quality skill's one-responsibility-per-file rule. No components folder, no theme module, no hooks. AGENTS.md also says to keep non-route code outside `src/app/`.
- Colors/spacing are inline literals (8 colors repeated). Four buttons implemented by `btn`+modifiers.
- `JSON.parse(raw) as SavedAlarm` unvalidated.
Alarm UX
- The "alarm" is a daily scheduled notification (channel importance MAX) with sound 'default'. Findings: [Expo Notifications SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/notifications/): exact timing needs `SCHEDULE_EXACT_ALARM` on Android 12+, denied by default on Android 14+ for new installs; `delivery: 'alarmClock'` also needs the permission; without it "scheduled notifications arrive at an approximate time"; `USE_EXACT_ALARM` on Android 13+ is limited to alarm/timer/calendar apps by Google Play policy; categories + `setNotificationCategoryAsync` give action buttons, responses via `addNotificationResponseReceivedListener`; page says nothing about full-screen intents or looping sound. (Only first 100k of 124k chars read.)
- Android platform: `USE_FULL_SCREEN_INTENT` on Android 14+ "can be granted only to apps that provide calling and alarm functionalities" — [AOSP FSI limits](https://source.android.com/docs/core/permissions/fsi-limits). Wake Mate does not declare it, so it cannot take over the lock screen. A true ringing screen needs a native module / custom config plugin (not in expo-notifications docs I read).
- Android alarms doc: `setAlarmClock()` is the highest-priority exact method, "the system never adjusts their delivery time"; exact alarm permission must be explained to the user and routed via `ACTION_REQUEST_SCHEDULE_EXACT_ALARM`; alarms are cleared on reboot unless rescheduled (BOOT_COMPLETED); Doze defers alarms unless exact. — [Android alarms](https://developer.android.com/develop/background-work/services/alarms)
- Behavior gaps: notification plays a single default sound (no loop until dismissed), no snooze/dismiss, no ringing screen, tapping the notification only opens Home (no route to an "I'm up" screen), `cancelAllScheduledNotificationsAsync` also cancels any future non-alarm notifications. "I'm up" is available any time while paired, not tied to the alarm having rung. Mate states: waiting (copy OK), paired-mate-asleep, mate-up are plain text; no timestamp for when mate woke, no countdown to wake time, no "alarm for tomorrow 07:00" next-ring summary.
- Accidental destructive actions: "Turn alarm off" is one tap and not confirmed; also leaves the match without notice.
- Time formatting: forced 24h (`is24Hour: true`, `formatTime` pads) ignores device 12/24h setting.

### Inferences
- The a11y contrast failure on the ghost button is a one-line fix and the highest-confidence defect.
- Because the product's core promise (wake up reliably, with an accountability mate) hinges on the ring, the notification-based alarm is the largest UX/feature risk; it needs a native alarm layer or an explicit, honest "this is a notification" fallback. Full-screen intent is permitted for alarm apps per AOSP, so Wake Mate is eligible in principle (Play review not verified).
- "Edge-to-edge always on in SDK 54+" is my background knowledge; the Expo page fetched supports only "with edge-to-edge on Android you need safe areas". Treat the always-on claim as unverified for SDK 58.

### Gaps
- Did not read the rest of the Expo notifications page (24k chars) or lib/match.ts, supabase.ts (match type shape beyond usage in index.tsx).
- No Material 3 page fetched directly (M3 guidance reference comes via the Android doc links); the Android doc is Compose-flavoured but the numbers (48dp, 4.5:1/3:1) apply.
- No device/emulator run; all findings are static.
- I did not find a source on RN 0.88-specific changes (reactnative.dev versioned docs not fetched).

## 3. Concrete changes ranked by impact, with sketches

### Takeaway
Fix contrast and a11y semantics first (cheap, certain), swap SafeAreaView, add real error/loading/offline states, split the file into hook + components + theme, then build the alarm ringing/snooze/mate flow on a separate route.

### Cited Findings (basis for sketches)
- Same sources as Section 2 (RN accessibility, Android a11y 48dp/contrast, safe-area-context, Expo notifications categories, AOSP FSI).

### Proposed changes (ranked) — all sketches are mine, unverified by running

1. Fix ghost button contrast (1.66:1) and design tokens. Impact: high, effort: minutes.
```ts
// src/theme.ts
export const color = { bg:'#14112b', surface:'#1f1b43', raised:'#2a2556', outline:'#4a4390',
  text:'#ffffff', textMuted:'#d8d4f5', accent:'#f59e6b', onAccent:'#14112b', warn:'#f5c76b', danger:'#ff8a8a' };
// secondary button: border + light text
ghost: { backgroundColor:'transparent', borderWidth:1, borderColor:color.outline }, ghostText:{ color:color.text }
```
(Check any new pair, e.g. #fff on #14112b is about 17:1.)

2. Accessibility pass. Impact: high.
```tsx
<Pressable role="button" accessibilityLabel={`Wake-up time ${formatTime(h,m)}`} accessibilityHint="Opens time picker" style={styles.clock} onPress={pickTime} />
<Pressable role="button" accessibilityState={{disabled: meAwake||busy, busy}} style={{minHeight:48}} .../>
<Text role="heading">Wake Mate</Text>
<Text accessibilityLiveRegion="polite">{mateAwake ? 'Your mate is up' : 'Your mate is still asleep'}</Text>
// link: minHeight 48, paddingVertical 14, role="button"
// clock: <Text maxFontSizeMultiplier={1.3} adjustsFontSizeToFit numberOfLines={1}>
```
Remove emoji from labels or wrap in a non-announced Text; keep text as the cue.

3. Replace deprecated SafeAreaView and make the screen scrollable. Impact: high on large font scale and gesture nav.
```tsx
import { SafeAreaView } from 'react-native-safe-area-context'; // Expo Router already provides the provider
<SafeAreaView style={styles.screen} edges={['top','bottom','left','right']}>
  <ScrollView contentContainerStyle={{ padding:24, gap:20, flexGrow:1 }}>...</ScrollView>
</SafeAreaView>
```
Alternative: `useSafeAreaInsets()` and pad the ScrollView content; Expo notes the hook may be slower than the component on rotation (app is portrait-locked, so negligible).

4. Real states with a small state machine. Impact: high (skill's headline rule).
```ts
type MatchState =
 | {k:'off'} | {k:'loading'} | {k:'error', retry:()=>void, offline:boolean}
 | {k:'searching', time:string} | {k:'paired', mateAwake:boolean, meAwake:boolean};
```
Render: skeleton/spinner on first hydrate (`hydrated` flag from AsyncStorage before showing the clock), inline error banner with Retry ("Can't reach Wake Mate. You're offline; your alarm still works"), `NetInfo`-style offline note (expo-network is the Expo module; verify in SDK 58 docs before adding), no silent `.catch(() => undefined)`: set an `actionError` and show a Snackbar/inline text. Stop polling when `AppState !== 'active'`, back off after failures, and only poll when `alarm.on` and paired/searching.

5. Split the file. Impact: medium-high (maintainability; code-quality skill).
```
src/app/index.tsx                 // composition only
src/app/ring.tsx                  // full-screen ringing route
src/components/{AlarmClock,MateCard,PrimaryButton,Banner}.tsx
src/hooks/{useAlarm,useMatch}.ts  // storage + schedule / polling + actions
src/theme.ts  src/lib/*           // unchanged
```
Validate stored JSON (type guard) instead of `as SavedAlarm`.

6. Alarm ringing + "I'm up" + snooze/dismiss flow. Impact: highest for product value, highest effort.
 - Phase A (JS only, works today): register notification category with actions "I'm up" (opensAppToForeground) and "Snooze 5 min" (reschedules a one-shot), handle in `addNotificationResponseReceivedListener`; default tap routes to `/ring`. Per Expo docs this is supported; no loop/full-screen.
 - Phase B (native): full-screen intent + `setAlarmClock` + looping alarm audio via foreground service, using a custom config plugin or a dedicated alarm library. Eligible for `USE_FULL_SCREEN_INTENT` as an alarm app per AOSP; Play policy review and library choice not verified.
 - `/ring` UI sketch: big time, mate status row ("Sam is awake" / "Waiting for Sam"), one huge primary "I'm up" (minHeight 72), secondary "Snooze 5 min" (cap snoozes, e.g. 2), no accidental-dismiss (hold-to-dismiss or confirm, with an accessible alternative since press-and-hold gestures need a custom action), `BackHandler` blocking back while ringing, `accessibilityLiveRegion="assertive"` for mate-woke updates, keep-awake while visible.
 - "I'm up" only enabled once the alarm has rung (server/time check), then show waiting-for-mate state ("You're up. Waiting for Sam…", mate-up celebration, timeout to "Sam didn't respond" with block/report in an overflow menu).
 - Ask for exact-alarm permission with an explanatory screen, check `getExactAlarmPermissionsAsync()`, deep link to the settings page (`requestExactAlarmPermissionsAsync`), show "Alarm may be late" banner if denied. Keep one of the two permissions declared deliberately (USE_EXACT_ALARM is Play-policy restricted to alarm apps; Wake Mate is arguably an alarm app but verify).

7. Smaller items. Impact: low-medium.
 - Confirm before "Turn alarm off" (or Undo snackbar).
 - Add `busy` guard to `imUp`, `report`; disable repeated taps.
 - Use device 12/24h preference (remove forced `is24Hour: true`).
 - Show "Next alarm: tomorrow 07:00" under the clock.
 - Hide dev copy ("Copy .env.example") behind `__DEV__`.
 - Replace `cancelAllScheduledNotificationsAsync` with cancel by stored identifier.
 - Set Navigation `ThemeProvider` dark theme from tokens; set adaptive icon background to match dark brand (#E6F4FE is light, my observation from app.json).
 - Add Stack screen for `/ring` with `gestureEnabled:false`, `presentation:'fullScreenModal'`.
 - Verify gate (skill step 4 mapped to RN): `npx expo lint`, `npx tsc --noEmit`, run on emulator at font scale 100%/200% and display size large, TalkBack walkthrough, screenshot attached.

### Inferences
- Order reflects effort-to-impact: items 1-3 can be a single small PR; 4-5 a refactor PR; 6 is a feature track needing a native-alarm decision.

### Gaps
- Code sketches were not compiled or run. Expo SDK 58 API names (e.g., expo-network, notification action option names) should be checked against versioned docs per AGENTS.md before implementing.
- Play Store policy acceptance for USE_EXACT_ALARM / USE_FULL_SCREEN_INTENT not verified.
