# Wake Mate (Android, Expo SDK 58 + Supabase): push, realtime status, voice/text chat

Research date: 2026-11-08. All vendor pricing was fetched from official pages on that date through a summarizing fetch tool, not read verbatim. Treat figures as "as fetched 2026-11-08" and re-check before committing. Items marked UNVERIFIED were not confirmed from a source in this session.

## (a) Push notification when your mate wakes (Expo Push + FCM + Supabase)

### Takeaway
Use expo-notifications with the Expo Push Service (which fronts FCM on Android). Send from a Supabase Database Webhook that triggers an Edge Function, with `priority: "high"` and a dedicated channel. The setup is well documented and has no per-message fee. It needs a development build, not Expo Go, plus a Firebase project, an FCM V1 service-account key uploaded to EAS, and `google-services.json`.

### Cited Findings
- Expo SDK 58.0.0 is the latest SDK listed on the docs, targeting React Native 0.88 and Node 22.13+. — [Expo SDK reference](https://docs.expo.dev/versions/latest/)
- Expo Push Service handles communication with FCM (Android) and APNs (iOS) behind one API. — [Expo push overview](https://docs.expo.dev/push-notifications/overview/)
- Client setup: `npx expo install expo-notifications expo-constants`, add the `expo-notifications` config plugin, add FCM V1 credentials, build a development build with `eas build` (the doc's testing flow uses a dev build), create an Android notification channel (`setNotificationChannelAsync`, importance MAX) before requesting permission, request permission, then call `getExpoPushTokenAsync({ projectId })`. — [Expo push setup](https://docs.expo.dev/push-notifications/push-notifications-setup/)
- FCM V1 credentials: create or reuse a Firebase project, generate a service-account private key (Settings > Service accounts), upload it with `eas credentials` or on expo.dev, download `google-services.json` to the project root, and set `expo.android.googleServicesFile`. Keep the service-account JSON out of git. If the API key is restricted, allow the FCM Registration API and Firebase Installations API. Use the app signing key SHA-1 from Play Console, not the upload key, or no push token is issued. — [Expo FCM credentials](https://docs.expo.dev/push-notifications/fcm-credentials/)
- Send API: POST `https://exp.host/--/api/v2/push/send`, up to 100 messages per request, 600 notifications/second per project (else `TOO_MANY_REQUESTS`), payload at most 4 KiB. — [Expo sending notifications](https://docs.expo.dev/push-notifications/sending-notifications/)
- `priority`: `default | normal | high`. The Android default is normal, which "may be delayed on sleeping devices"; high is delivered sooner and can wake devices. — [Expo sending notifications](https://docs.expo.dev/push-notifications/sending-notifications/)
- `channelId` (Android): if the channel does not exist on the device, the notification is not shown. If it is unset, Expo uses a "Default" channel. — [Expo sending notifications](https://docs.expo.dev/push-notifications/sending-notifications/)
- `ttl` defaults to the provider default of 4 weeks. A very low ttl (e.g. 0) can stop normal-priority Android messages from reaching dozing devices. — [Expo sending notifications](https://docs.expo.dev/push-notifications/sending-notifications/)
- Receipts: tickets only mean Expo accepted the message. Fetch receipts via `getReceipts` (up to 1000 IDs) about 15 minutes after sending; they are cleared after 24 hours. `DeviceNotRegistered` means stop sending to that token. — [Expo sending notifications](https://docs.expo.dev/push-notifications/sending-notifications/)
- Supabase's official pattern: a Database Webhook on INSERT into a `notifications` table calls an Edge Function (POST, with the service key auth header). The function looks up `profiles.expo_push_token` and POSTs to Expo with a Bearer `EXPO_ACCESS_TOKEN` (enable "Enhanced Security for Push Notifications" in Expo). The docs also show a direct-FCM variant (`fcm_token` plus a Firebase service account in the function). — [Supabase push notification guide](https://supabase.com/docs/guides/functions/examples/push-notifications)
- FCM Android priority: normal is delayed in Doze; high tries to deliver immediately and can wake a sleeping device, and should lead to user interaction. FCM may downgrade high-priority messages to normal if they do not produce user-visible notifications (about 7 days of behavior is evaluated per app instance). Blocked notifications lead to deprioritization. Put the content in the payload, not a server round-trip. — [Firebase message priority](https://firebase.google.com/docs/cloud-messaging/android/message-priority)
- Android Doze suspends network access, ignores wake locks, and defers jobs/alarms. Google recommends FCM for downstream messaging. Chat/calling apps are explicitly told battery-optimization exemptions are not acceptable if FCM is usable. — [Android Doze/App Standby](https://developer.android.com/training/monitoring-device-state/doze-standby)
- Supabase Edge Functions: 500k invocations/month included on Free, 2M on Pro then $2 per million. — [Supabase pricing](https://supabase.com/pricing)
- EAS: Free plan has up to 15 Android + 15 iOS builds/month; Starter $19/mo; Production $199/mo. The page does not mention push fees. — [Expo pricing](https://expo.dev/pricing)

### Inferences
- Send "mate woke" pushes as `priority: "high"` with a visible notification (title/body in payload), a custom `channelId` created on app start, and a short, nonzero ttl (e.g. 1 to 4 hours, since a stale "your mate woke" is useless). This matches FCM's guidance and avoids downgrade.
- Reliability weak points are on the device (OEM battery killers, user-disabled notifications, stale tokens), not Expo or FCM. Handle `DeviceNotRegistered` by clearing the token, and re-register the token on each app launch.
- Wake Mate volume (a few pushes per user per day) is far below 600/sec unless many mates wake at the same minute. At 100k users with clustered 7:00 wake times, batch in 100s and respect the rate limit (e.g. 10k pushes in about 17 seconds at the limit; this is arithmetic, not a measured result).
- Database webhook is the least-code path. An alternative the Supabase docs do not cover in the pages fetched: pg_net called from a trigger or pg_cron. UNVERIFIED in this session.
- Push costs: Expo Push and FCM have no per-message fee that I found. Whether Expo imposes any plan-level push cap is not stated on the pages fetched. UNVERIFIED. Firebase FCM is documented as free, but I did not fetch a Firebase page confirming that, so mark UNVERIFIED.

### Gaps
- No official source fetched on pg_net-based sending or on Expo Push quotas beyond the 600/sec limit.
- Whether remote push works in Expo Go on Android under SDK 58: UNVERIFIED (not fetched). Plan on a dev build regardless.
- Real-world delivery latency/reliability numbers: none found from primary sources.
- Android 13+ `POST_NOTIFICATIONS` runtime permission handling is implied by the permission flow in the Expo doc but not independently checked.

## (b) Realtime status instead of 5-second polling

### Takeaway
Use Supabase Realtime, preferring Broadcast from the database (private channels with RLS on `realtime.messages`) over postgres_changes once volume grows. Hold the WebSocket only while the app is in the foreground (e.g. on the "waiting for mate" screen) and rely on FCM push when backgrounded. Realtime is free at small scale. The binding constraint is peak concurrent connections (200 Free, 500 Pro, 10,000 Pro without spend cap/Team).

### Cited Findings
- postgres_changes authorizes every event against each subscriber (100 subscribers means 100 RLS checks). Changes are processed on a single thread, so a bigger compute add-on will not meaningfully raise throughput. With RLS, total throughput tops out around 3,000 to 4,000 messages/sec. Supabase recommends Broadcast if expecting more than about 3,000 concurrent subscribers to the same changes. — [Supabase Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes)
- DELETE events are not subject to RLS. Filtering DELETE events requires `REPLICA IDENTITY FULL`. Filters support eq, neq, lt/gt, in (max 100), like, etc., combined with AND only. — [Supabase Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes)
- Broadcast from the database: `realtime.broadcast_changes()` / `realtime.send()` called from a trigger. Private channels are the default and need authorization via RLS policies on `realtime.messages`; clients call `supabase.realtime.setAuth()` before subscribing. Database-originated messages are kept 3 days. The docs' example policy (`USING (true)`) is only a starting point. — [Supabase Broadcast](https://supabase.com/docs/guides/realtime/broadcast)
- Realtime limits by plan: concurrent connections 200 (Free) / 500 (Pro) / 10,000 (Pro without spend cap, Team); messages per second 100 / 500 / 2,500; channel joins per second 100 / 500 / 2,500; broadcast payload 256 KB / 3,000 KB. — [Supabase Realtime limits](https://supabase.com/docs/guides/realtime/limits)
- Realtime pricing: $2.50 per million messages and $10 per 1,000 peak connections above quota. Quotas: Free 2M messages and 200 peak connections; Pro and Team 5M messages and 500 peak connections. — [Supabase Realtime pricing](https://supabase.com/docs/guides/realtime/pricing)
- Platform pricing: Free $0 (50,000 MAU, 500 MB DB, 1 GB storage, 5 GB egress); Pro from $25/mo (100,000 MAU included then $0.00325/MAU, 8 GB DB, 100 GB storage, 250 GB egress then $0.09/GB). Pro spend cap is on by default. — [Supabase pricing](https://supabase.com/pricing)
- Doze suspends app network access while the device is idle, with periodic maintenance windows. Apps are told to use FCM instead of persistent connections. — [Android Doze/App Standby](https://developer.android.com/training/monitoring-device-state/doze-standby)

### Inferences
- A 5-second poll is 12 requests per minute per user (about 720 per hour). Polling only during an active "waiting" window is cheap in Supabase terms (no per-request fee found, only egress), but it costs radio wake-ups and battery, and it stops working in Doze anyway. Realtime plus FCM replaces it more reliably. I did not find a source that measures the battery difference. UNVERIFIED.
- For a 1:1 pair, a per-pair private Broadcast channel (topic like `pair:<id>`) with a DB trigger is simple, RLS-scoped to the two members, and avoids the per-subscriber RLS cost of postgres_changes. postgres_changes is fine for the MVP (one filtered subscription, `eq` on pair id) and a smaller migration if you want to ship fast.
- Reconnect: the supabase-js reconnect/heartbeat behavior was not documented on the pages fetched, so the following is a design recommendation, not a sourced fact. On app resume (AppState `active`), re-check state with one REST read, then re-subscribe, so missed events during Doze or background are recovered. Treat Realtime as a hint and the database row as truth.
- Free tier will break first at about 200 simultaneous connections. Morning wake times cluster, so peak concurrency is a fraction of users (assumption: 10 to 20% of MAU at the peak minute).

### Gaps
- supabase-js reconnect/backoff and React Native background behavior: not found in fetched pages.
- How Supabase counts a "message" for billing (e.g. whether one broadcast to two subscribers is 1 or 2): linked guides not fetched. UNVERIFIED.
- Team plan price and DB compute add-on needs at 10k to 100k users: not fetched. UNVERIFIED.

## (c) Voice / text chat between two matched strangers

### Takeaway
Cheapest, lowest-risk path: text via Supabase (a messages table plus Realtime) and a 15-second "good morning" voice note recorded with expo-audio and stored in Supabase Storage. For live voice later, LiveKit Cloud (Ship $50/mo) or Daily/Agora give the best per-minute economics; Twilio is about 4 to 8x more expensive per minute and Stream Chat is priced for large chat products, not a text MVP.

### Cited Findings
- Voice note: expo-audio (SDK 58 docs, `~58.0.11`) provides `useAudioRecorder`, `prepareToRecordAsync()`, `record({ forDuration })`, `stop()` then `recorder.uri`. `RecordingPresets.HIGH_QUALITY` yields `.m4a` AAC at 44.1 kHz, 2 channels, 128 kbps. The config plugin adds `RECORD_AUDIO` on Android. Recordings land in the cache directory unless `directory: 'document'` is set. Background recording additionally needs `FOREGROUND_SERVICE_MICROPHONE`. — [expo-audio](https://docs.expo.dev/versions/latest/sdk/audio/)
- Supabase Storage standard uploads are suited to files up to 6 MB; TUS resumable is recommended above that. — [Supabase standard uploads](https://supabase.com/docs/guides/storage/uploads/standard-uploads)
- Supabase storage/egress allowances: Free 1 GB storage / 5 GB egress; Pro 100 GB / 250 GB, then $0.0213/GB storage and $0.09/GB egress. — [Supabase pricing](https://supabase.com/pricing)
- LiveKit Cloud: Build $0 (5,000 WebRTC participant-minutes, 50 GB bandwidth, 100 concurrent); Ship from $50/mo (150,000 minutes, then $0.0005/min, 1,000 concurrent); Scale from $500/mo (1.5M minutes, then $0.0004/min, 5,000 concurrent). — [LiveKit pricing](https://livekit.com/pricing)
- LiveKit in Expo: not compatible with Expo Go; needs `expo-dev-client` and a development build. Packages: `@livekit/react-native`, `@livekit/react-native-expo-plugin`, `@livekit/react-native-webrtc`, `@config-plugins/react-native-webrtc`, `livekit-client`; call `registerGlobals()`. — [LiveKit Expo docs](https://docs.livekit.io/transport/sdk-platforms/expo/)
- Agora: starting at $0.59 per 1,000 minutes, first 10,000 combined RTC minutes free per month. The summary did not say whether $0.59 is the voice-specific rate. — [Agora pricing](https://www.agora.io/en/pricing/)
- Daily: 10,000 free participant-minutes per month; audio-only calls $0.00099 per participant-minute (list); video/audio calls $0.004. Audio-only billing applies only if no video track is ever sent in the session. — [Daily pricing](https://www.daily.co/pricing/video-sdk/)
- Twilio Programmable Video: from $0.004 per participant-minute, page states "Pricing current as of October 2026"; no end-of-life notice was found on that page. — [Twilio Video pricing](https://www.twilio.com/en-us/video/pricing)
- Stream Chat: Free (Build) 1,000 MAU / 100 concurrent; Start $399/mo billed annually ($499 monthly) with 10,000 MAU / 500 concurrent; Elevate $599/mo annually ($675 monthly); overage $0.09 per MAU. A Maker account offers a $100/mo credit for small, low-revenue projects. — [Stream Chat pricing](https://getstream.io/chat/pricing/)

### Inferences
- A 15-second note at 128 kbps stereo is about 240 KB (15 s x 16 KB/s, my arithmetic). Mono at 64 kbps would be about 120 KB. Both are well under 6 MB, so a plain upload to a private bucket (path `{pair_id}/{date}.m4a`, RLS limited to the two members, signed URL for playback) is enough. Delete after 24 to 48 hours (pg_cron or scheduled Edge Function) to keep storage near zero. It needs no WebRTC, so no extra native modules beyond expo-audio.
- Voice notes plus a push ("Your mate sent a good morning") are lower-risk for strangers than live voice: asynchronous, so easier to moderate. Moderation, reporting and blocking are needed for either mode (not researched).
- Text-only via Supabase: a `messages` table plus Broadcast/postgres_changes on the pair channel. It is nearly free but you build read state, moderation and abuse tools yourself. Stream Chat would add those features but its $399+/mo floor is not justified until the MAU is in the thousands of paying-equivalent users. The free tier (1,000 MAU) could cover a pilot.
- Cheapest live-voice vendors per participant-minute at list: LiveKit overage $0.0005 (Ship), Agora about $0.00059, Daily audio-only $0.00099, Twilio $0.004. LiveKit has the clearest Expo path in the docs. I did not check Agora/Daily/Twilio Expo compatibility. UNVERIFIED. Twilio's RN Video SDK status is UNVERIFIED.

### Gaps
- Expo/dev-build compatibility for Agora, Daily, Twilio and Stream: not fetched.
- Agora voice-only vs video rate, and Agora's RTC rate beyond the first tier: not confirmed.
- Content moderation and Play Store user-generated-content policy requirements for stranger chat: not researched. Flag this before Phase 3.
- Whether Supabase Storage upload from React Native needs ArrayBuffer/base64 handling: the page fetched had no RN guidance. UNVERIFIED.

## Phased roadmap and rough cost at 1k / 10k / 100k users

### Takeaway
Phase 1 (push) and Phase 2 (realtime) cost almost nothing until about 10k users; the cost to watch is Realtime peak connections, then Storage egress for voice notes. Live voice is a separate, optional, small line item if you choose LiveKit/Daily/Agora.

### Cited Findings
- All unit prices used below come from the pages cited above: [Supabase pricing](https://supabase.com/pricing), [Realtime pricing](https://supabase.com/docs/guides/realtime/pricing), [LiveKit](https://livekit.com/pricing), [Daily](https://www.daily.co/pricing/video-sdk/), [Agora](https://www.agora.io/en/pricing/), [Twilio](https://www.twilio.com/en-us/video/pricing).

### Inferences
Phases and effort (my estimates, one developer):
1. Phase 1, push when mate wakes (2 to 4 days): Firebase project, FCM V1 key to EAS, `google-services.json`, dev build, token table, Database Webhook plus Edge Function, channel + high priority, receipt/`DeviceNotRegistered` cleanup. Cost: $0 incremental.
2. Phase 2, realtime status (2 to 3 days): replace polling with a pair channel (start with postgres_changes filtered by pair id; move to private Broadcast + RLS if scaling). Subscribe only in foreground; re-sync on resume. Cost: free until about 200 concurrent, then Pro.
3. Phase 3, 15-second voice note (3 to 5 days): expo-audio record, upload to private bucket, signed URL playback, push on receipt, auto-delete, report/block. Cost: storage and egress only.
4. Phase 4, text chat (3 to 5 days): messages table, Realtime, moderation basics. Cost: Realtime messages.
5. Phase 5, optional live voice (1 to 3 weeks): LiveKit (token Edge Function, dev build, call UI, permissions, abuse controls).

Assumptions (all mine, not sourced): peak concurrent connections = 15% of users; 1 voice note/user/day at about 240 KB, listened once, deleted after 2 days; about 2 status events/user/day, each counted as 2 realtime messages; 10% of users make one 10-minute live call/month (20 participant-minutes); Pro DB compute upgrades not included.

| Scale | Supabase base | Realtime | Voice-note egress | Edge Functions | Push | Rough total (Phases 1 to 3) | Optional live voice (20 pm per 10% of users/mo) |
|---|---|---|---|---|---|---|---|
| 1k | Free possible; Pro $25 recommended | peak ~150 within 200 free | ~7 GB/mo vs 5 GB free; ~0 on Pro | ~60k invocations, free | $0 | $0 to $25/mo | 2,000 pm: free on LiveKit/Daily/Agora; Twilio ~$8 |
| 10k | Pro $25 | peak ~1,500: 500 included + 1,000 extra = ~$10; needs spend cap off | ~72 GB, within 250 GB | ~600k, within 2M | $0 | ~$35 to $60/mo | 20,000 pm: LiveKit Ship $50; Daily audio ~$10; Agora ~$6; Twilio ~$80 |
| 100k | Pro $25, 100k MAU included; Team/Enterprise likely required | peak ~15,000 exceeds the 10,000 cap, so custom limits needed; overage ~$140 plus ~12M msgs, ~$17 | ~720 GB: (720-250) x $0.09 = ~$42 | ~6M: ~$8 | $0 | roughly $250 to $900+/mo (Team price and compute not verified) | 200,000 pm: LiveKit ~$75; Daily ~$188; Agora ~$112; Twilio ~$800 |

- Cost-saving levers: connect Realtime only on the "waiting for mate" screen and disconnect on background; use mono 64 kbps for notes; auto-delete notes; batch pushes.
- At 100k, wake times cluster, so peak concurrency drives the bill and the need for a limit increase more than total MAU.

### Gaps
- Team plan price, compute add-on costs, and DB size for 100k users: not researched; the 100k total is a wide range for that reason.
- The peak-concurrency and usage assumptions are guesses; replace them with real analytics from an early cohort.
- Google Play policy review for anonymous stranger-to-stranger voice/text (user-generated content, safety): not researched.
