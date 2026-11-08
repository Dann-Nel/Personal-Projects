# Wake Mate (Android)

Set a daily alarm. Get matched with a stranger waking up at the same time. Tap "I'm up!" and see when your mate is up too.

Stack: Expo (React Native, Expo Router) + Supabase (anonymous auth, Postgres, RPC functions).

## Setup
1. Create a Supabase project. Enable **Authentication > Providers > Anonymous sign-ins** (and turn on CAPTCHA: see below).
2. Run `supabase/migrations/001_init.sql`, then `002_hardening.sql`, in the SQL editor.
3. `cp .env.example .env` and fill in the project URL and anon key.
4. `npm install`
5. `npx expo run:android` (a dev build is required; Expo Go cannot schedule reliable alarms on current Android).

## How it works
- `src/lib/alarm.ts`: daily alarm with `delivery: 'alarmClock'` (AlarmManager `setAlarmClock`, not deferred by battery optimisation) on an alarm-audio channel. Cancels only its own alarm. Includes a 1-minute test alarm.
- `src/hooks/useAlarm.ts`: stored alarm, notification and exact-alarm permission state (re-checked when the app returns to the foreground).
- `src/hooks/useMatch.ts`: polls only in the foreground with backoff, re-enrols for the next slot on a new day / after "I'm up" / when the time changes (so daylight-saving shifts are picked up).
- `supabase/migrations`: 15-minute slots (people within the same quarter hour pair), one future slot per user, a leaving partner is re-paired instead of stranded, block and report eject the reported user, check-in only around the slot, rate limits, RPC-only table access, the mate's id never reaches the client.
- Tapping the alarm notification opens `src/app/ring.tsx` (big "I'm up!" button and mate status).

## Tests
`supabase/tests/run.sh` applies the migrations to a throwaway local Postgres (with a stubbed `auth` schema) and runs the matching scenarios. It is **not** real Supabase, so pg_cron, PostgREST error mapping and Supabase's default grants are untested. `npm run typecheck` runs the TypeScript check.

## Known limits and next steps
- The alarm is still a notification: no looping ringer or lock-screen takeover. Next step: a small Kotlin Expo module (`setAlarmClock` receiver, foreground service looping `USAGE_ALARM` audio, full-screen activity, boot/time-zone receivers). See `reports/Wake Mate Android build plan.md` at the repo root.
- Matching happens when the app is opened (or the alarm notification is tapped). A server-side standing alarm plus scheduled enrolment job is not built.
- `private.purge()` (retention of anonymous accounts, old matches, reports) exists but needs the `pg_cron` schedule line enabled in `002_hardening.sql`.
- Anonymous sign-ins should have CAPTCHA/Turnstile enabled in Supabase. Not wired in the client.
- Blocks are tied to anonymous ids, so reinstalling defeats them; needs device attestation or a linked account.
- Before a public release: Google Play declarations for `USE_EXACT_ALARM` / full-screen intent, an 18+ age screen, a public child-safety page and contact, in-app and web account deletion. Play policy text was not read directly.
- No snooze or notification action buttons yet. Lint is not set up (ESLint peer-dependency conflict with `expo lint`).
- Nothing here has been run on a device or emulator.
