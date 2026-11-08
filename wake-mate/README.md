# Wake Mate (Android)

Set a daily alarm. Get matched with a stranger waking up at the same time. Tap "I'm up!" and see when your mate is up too.

Stack: Expo (React Native, Expo Router) + Supabase (anonymous auth, Postgres, RPC functions).

## Setup
1. Create a Supabase project. Enable **Authentication > Providers > Anonymous sign-ins**.
2. Run `supabase/schema.sql` in the SQL editor.
3. `cp .env.example .env` and fill in the project URL and anon key.
4. `npm install`
5. `npx expo run:android` (uses a dev build; Expo Go cannot schedule reliable alarms on current Android).

## How it works
- `src/lib/alarm.ts`: daily repeating notification on a MAX-importance channel.
- `src/lib/match.ts` and `supabase/schema.sql`: `join_match` pairs people by UTC wake minute (so timezones work), with a per-slot lock, block-list awareness and report support.
- `src/app/index.tsx`: the one screen: time picker, alarm toggle, match status, "I'm up!".

## Known limits and next steps
- The alarm is a notification, not a full-screen ringing alarm. A native full-screen alarm UI is the next Android step.
- Android 12+ can require the user to grant "Alarms & reminders" for exact timing; add an in-app prompt.
- Matching is 1:1 and happens when someone sets or changes their time; there is no fallback yet if nobody shares your slot.
- Voice or chat with your mate, push when the mate wakes (instead of 5s polling), and moderation tooling are not built.
- Lint is not set up (ESLint peer-dependency conflict with `expo lint`).
