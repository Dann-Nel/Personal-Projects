# Backend-design `design` skill applied to Wake Mate's matching backend

Scope: what the `backend-design:design` skill's workflow is, and a design review of `/home/user/Personal-Projects/wake-mate/supabase/schema.sql` and `/home/user/Personal-Projects/wake-mate/src/lib/match.ts` (plus the single call-site file `src/app/index.tsx`, `src/lib/supabase.ts`, `src/lib/alarm.ts`). Date context: 2026-11-08. Constraints: 1:1 matching, Supabase anonymous auth, Android-only client.

How evidence is labelled in this file:
- "Skill text" = content returned by the Skill tool in this session from the installed `backend-design` plugin. It has no public URL; the cited path is the local plugin install.
- "Code observation" = read directly from the Wake Mate files, with line numbers.
- "Tested" = I reproduced it on a scratch PostgreSQL 16.15 instance with a stubbed `auth` schema (`auth.users`, `auth.uid()` reading `request.jwt.claim.sub`, roles `anon`/`authenticated`). This is not a real Supabase project; see Gaps in each section for what that does not prove.
- The tested fix patch is saved at `/home/user/Personal-Projects/research_notes/Source frontend backend design skills/backend_design_patch_v2.sql` (245 lines, applies on top of `schema.sql`). The repo itself was not modified.

---

## Q1. What is the `backend-design:design` skill, and what are its 6 steps and their outputs?

### Takeaway
All requested skills exist and loaded: `backend-design:design`, `think-before-coding`, `idempotency-and-side-effects`, `auth-and-authorization`, `data-modeling-discipline`, `security-discipline`. `design` is an interactive command that wraps the 6-step `think-before-coding` workflow, then hands the six answers to a `component-architect` agent to produce a blueprint, and forbids writing code until the user approves. The six steps are: context, data model, failure modes, authorization, idempotence/concurrency, observability.

### Cited Findings
- `backend-design:design` (invoked via Skill tool; loaded successfully) is a command whose own text says: "Before any code, you run the 6-step workflow from the `think-before-coding` skill". Flow: (1) establish context by classifying the component (HTTP endpoint, worker, queue/event consumer, CLI/admin script, ETL/batch, cron, outbound integration, long-running daemon) and state it in one sentence if obvious; (2) run the 6 steps, presenting each answer in a few lines and asking at most one targeted question per step (e.g. "is the caller a UI that retries on its own, or a background job that we control?" rather than "what do you want for error handling?"); (3) delegate the blueprint to the `component-architect` agent, passing the six answers, then ask the user to review; do not start coding until approved. Source: skill text, plugin `backend-design`, local path `/root/.claude/plugins/synced/f69a9f57-eaea-4da2-896d-07c7681a5ac0_b37344c7-d43a-4ccd-837a-bab3456b4bb6/ef408ccc-a774-4e6a-bb53-7f61db8ac483/skills/` (skills list: `think-before-coding`, etc.). The skill has no public URL.
- Hard rules in `design`: do not write code in this command; do not skip a step even for "simple" components; do not default to CRUD shape (name the operation by what it does); adapt questions to context (a CLI does not need RED metrics, a consumer does not need a healthcheck). After approval, implementation follows the blueprint's build sequence and calls out sibling skills: schema -> `data-modeling-discipline`, `migration-safety`; queries -> `query-discipline`; mutations -> `idempotency-and-side-effects`; error path -> `error-handling-as-design`; instrumentation -> `observability-by-default`. Source: same.
- The six steps and the artifact each produces (from `think-before-coding`; "Hard Gate": no code, files or architecture until all six are answered; match depth to stakes; summarize the six answers in 10-20 lines before implementing). Source: skill text, `think-before-coding`.
  1. **Identify the context.** Output: a classification (table of latency budget / failure mode / concurrency model per context) plus an expected load figure ("endpoint at 5 req/s" vs "5000 req/s").
  2. **Model the data.** Output: entities and relationships, invariants that must never be false (enforced in schema via CHECK/UNIQUE/FK/NOT NULL where possible), ownership (who owns/mutates a row), lifecycle (states and legal transitions).
  3. **List the failure modes.** Output: a context-specific failure list with detect / surface / recover decided for each (endpoint: 4xx/5xx/409/timeouts; worker: transient vs permanent vs poison; CLI: partial run, Ctrl-C; cron: overlap, missed window; outbound: 4xx no retry, 5xx retry with backoff+jitter, timeout = unknown state). Plus a short security pass: what it exposes, trusts, can leak.
  4. **Map authorization.** Output: principal, scope, resources, and enforcement point; "anyone authenticated" is explicitly not an answer; for multi-tenant data the DB (RLS) enforces.
  5. **Decide idempotence and concurrency.** Output: one sentence each for replay (same input twice), concurrent (row lock / advisory lock / version column / partitioning / accepted last-write-wins), out-of-order (for consumers).
  6. **Decide observability.** Output: what is logged at boundaries (structured, trace id), the right metrics for the context (RED for endpoints/consumers; lag/throughput/retry/DLQ for workers; duration/rows/last-success for cron), and what "healthy" means.
- `idempotency-and-side-effects` core test: "What happens if this runs twice with the same input?"; the answer must be "the same observable outcome as if it ran once". Idempotency keys are mandatory for client-driven mutations that cost money, send messages, create user-visible rows, or trigger workflows; optional for pure reads, writes protected by a UNIQUE constraint, and set-to-constant updates. Counters (`value = value + 1`) are the classic non-idempotent trap. Do not make side effects (push, third-party calls) inside the DB transaction; use an outbox. Source: skill text, `idempotency-and-side-effects`.
- `auth-and-authorization`: five questions (authN mechanism, authZ model/scope, enforcement point, fail closed, auditability); defense in depth across middleware, service, and data layer; "auth at the top, ignored at the bottom" and "JWT claims trusted as truth" are named anti-patterns; multi-tenant data enforced by RLS; default RBAC plus per-resource ownership checks at the data layer. Source: skill text, `auth-and-authorization`.
- `data-modeling-discipline`: constraints in the schema not the app; NOT NULL default; every FK has an explicit ON DELETE choice and a child-side index; `timestamptz`; avoid soft delete (prefer hard delete, archive table, or explicit state); model state rather than boolean flags. Source: skill text, `data-modeling-discipline`.
- `security-discipline`: per-change audit (what does it expose / trust / leak / is the default closed); deny by default; BOLA/IDOR (per-id routes must enforce ownership at the data layer); generic errors externally (return 404 not 403 to avoid enumeration); PII/secrets not in logs. Source: skill text, `security-discipline`.
- Related, not part of the workflow: `design` refers to a `component-architect` agent. No such agent is exposed in this subagent's toolset, so that hand-off step was not executed; the six answers below are the equivalent of its input. Source: skill text + this session's tool list.

### Inferences
- `design` is meant for greenfield components; for an existing one the same six steps work as an audit, and the plugin also ships `backend-design:audit` (listed in the skill index, not invoked here). The user asked for a design review, so the six steps are used as the review frame.
- The "no code in this command" rule conflicts with this task's explicit request for proposed SQL fixes. I treated the fixes as review output, not as the implementation step, and kept them in a separate patch file.
- Wake Mate's classification: a set of synchronous RPC commands (`join_match`, `leave_match`, `mark_awake`, `block_and_report`, `my_current_match`) executing in Postgres via the Supabase Data API (PostgREST `rpc`), plus (missing today) a scheduled pairing/purge job. So it is "sync command endpoint" for the RPCs and "cron" for pairing/retention. Expected load is not stated anywhere in the repo.

### Gaps
- No public documentation for the `backend-design` plugin was found or searched; the skill text itself is the only source.
- The `component-architect` agent was not available, so the blueprint step was not run.

---

## Q2. The six steps run on the Wake Mate matching component

### Takeaway
The design is a sensible small core (UTC-slot rendezvous, per-slot advisory lock, definer RPCs, deny-by-default RLS, revoke from anon), but it models "a match row per join" instead of "a user's single standing wake slot", which is the root of most defects: multiple slots per user, stranded partners, blocks that do nothing to the live match, no daily re-enrolment, and exact-minute pairing that makes cold start nearly hopeless.

### Cited Findings

**Step 1 - Context and load**
- Components: five RPCs in `public`, callable through the Supabase Data API; client calls them from `src/lib/match.ts` L32-62. Code observation.
- `join_match` is called from exactly one place, `enable()` in `src/app/index.tsx` L77, i.e. only when the user (re)sets the alarm; `disable()` only calls `leaveMatch`. A grep for `joinMatch|leaveMatch|blockAndReport|markAwake|currentMatch` across the repo found no other call sites. Code observation.
- The client polls `my_current_match` every 5 s whenever the screen is mounted (`index.tsx` L55-59). Code observation.
- The alarm itself is scheduled locally (`scheduleDailyAlarm`, `index.tsx` L73), so a backend outage does not stop the alarm ringing. Code observation.
- Supabase Data API exposes database functions through `rpc()`, REST and GraphQL; "By default, any role can run a database function", including `anon`. Source: [Supabase: Database Functions](https://supabase.com/docs/guides/database/functions) (fetched via WebFetch summary).

**Step 2 - Data model: entities, invariants, lifecycle**
- Entities: `matches` (one row per slot: `user_a`, nullable `user_b`, `a_awake_at`, `b_awake_at`, `match_date`, `wake_utc_minute`), `blocks` (PK `(blocker, blocked)`), `reports`. Code observation, `schema.sql` L4-32.
- Invariants that the schema enforces today: `wake_utc_minute` in 0..1439 (CHECK, L7); `user_a` NOT NULL; FKs to `auth.users` with cascade; block pair unique. Code observation.
- Invariants stated or implied but not enforced in the schema: a user is in at most one slot per wake date; `user_a <> user_b`; `b_awake_at` only if `user_b` set; at most one waiting row per slot at rest; awake timestamps only within the wake window; reports retained as evidence. Code observation (absence of constraints in L4-32).
- Lifecycle is implicit: waiting (user_b null) -> paired -> awake marks; no ended/expired state, no cleanup. `leave_match` only deletes waiting rows owned by the caller (L104-107). Code observation.
- Tested (original schema): `delete from auth.users` of the `user_b` user deleted the whole match row (FK `user_b ... on delete cascade`), i.e. the partner's match vanished; deleting the reported user also deleted `reports` rows (FK cascade on `reported`). Tested.
- Postgres docs: `SELECT ... FOR UPDATE` blocks conflicting lockers until the transaction ends; with `ORDER BY` + lock at READ COMMITTED rows can come back out of order; `SKIP LOCKED` "provides an inconsistent view of the data, so this is not suitable for general purpose work, but can be used to avoid lock contention with multiple consumers accessing a queue-like table". Source: [PostgreSQL: SELECT - The Locking Clause](https://www.postgresql.org/docs/current/sql-select.html).

**Step 3 - Failure modes**
- `join_match` with `p_utc_minute = NULL`: `NULL not between 0 and 1439` is NULL, so the "bad minute" guard does not fire; the call falls through to the INSERT and fails on the NOT NULL constraint with a raw 23502 error. Tested on the original.
- Date boundary logic: `d := today_utc + (p_utc_minute > nowm ? 0 : 1)` (L57). There is no minimum lead time: a join at 06:59:50 for minute 420 creates a slot 10 seconds away that nobody can realistically join. Equality (`p == nowm`) correctly rolls to tomorrow. Code observation.
- DST: `localToUtcMinute` (`src/lib/alarm.ts` L58-62) converts the local alarm time to a UTC minute using today's offset and the server stores only that UTC minute. If a DST change occurs, the stored slot no longer matches the unchanged local alarm; the single join-on-enable means it is never recomputed. Code observation + inference.
- Client swallows errors: `leaveMatch(...).catch(() => undefined)` (L76, L88) and `markAwake(...).catch(() => undefined)` (L108). If the leave fails, `joinMatch` proceeds anyway and the user ends up in two slots. Code observation.
- Backend unreachable: `refreshMatch` swallows errors and keeps previous state (L40-44); the local alarm still rings. Code observation.
- Original `my_current_match` selects by `created_at > now() - 36h` ordered by `created_at desc` (L86-92), not by slot time. It can return a match whose slot has long passed, and after a time change returns the newest-created row. Code observation.

**Step 4 - Authorization / RLS / SECURITY DEFINER**
- Principal: every installation is an anonymous Supabase user (`signInAnonymously`, `src/lib/supabase.ts` L27). Anonymous users get a JWT with an `is_anonymous` claim and use the `authenticated` Postgres role, so a `to authenticated` grant includes them; Supabase advises reviewing existing policies before enabling anonymous sign-ins. Source: [Supabase: Anonymous Sign-Ins](https://supabase.com/docs/guides/auth/auth-anonymous).
- All five functions are `security definer set search_path = public` (L46, 88, 95, 105, 110). Supabase's guidance: "Prefer `security invoker`, which is also the default"; if using `security definer`, set `search_path` (recommended empty) and schema-qualify; functions created in the Dashboard/migrations are owned by `postgres`, which bypasses RLS; "A `security definer` function can return rows the caller isn't allowed to read"; execute grants control who can call, not which rows are returned, so ownership must be checked inside the body. Source: [Supabase: Database Functions](https://supabase.com/docs/guides/database/functions). Also: do not create definer functions in an exposed schema; set `search_path = ''`. Source: [Supabase: Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).
- The functions do check `auth.uid()` ownership inside their bodies (e.g. `mark_awake` L100, `leave_match` L106, `block_and_report` L113), so BOLA is handled. `revoke all ... from public, anon; grant execute ... to authenticated` (L121-124) matches the Supabase recommendation. Code observation. Tested: with the original grants the `anon` role is denied (`permission denied for function join_match`).
- RLS: policy "read own matches" `using (auth.uid() in (user_a, user_b))` (L40-41) has no `to authenticated` clause and uses bare `auth.uid()`; Supabase recommends always naming the role and wrapping as `(select auth.uid())` for per-statement evaluation, and says to revoke default grants from `anon`/`authenticated` then grant back minimally. Source: [Supabase: Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security). The schema never revokes table-level grants; it relies on RLS having no INSERT/UPDATE/DELETE policy. Tested: direct `insert into matches` as `authenticated` fails with "new row violates row-level security policy", so deny-by-default holds.
- Information exposure: the select policy and the RPCs return the whole row, so each user receives their mate's anonymous `auth.users` UUID and can enumerate all historical mates' UUIDs; `toView` (`match.ts` L20-30) then compares `user_a === me` client-side, which is the only reason the client needs the UUID. Code observation.
- `blocks` and `reports` have RLS enabled and no policies, so they are not readable/writable via the API (deny by default). Code observation.

**Step 5 - Idempotence and concurrency**
- `join_match` replay with the same minute: after `pg_advisory_xact_lock` it first looks for the caller's own row in the slot and returns it (L62-64), so same-slot replay is idempotent (natural key = user + slot). Tested on the new version; code-read for the original.
- Replay with a different minute is not "set my wake time": it creates an additional row (tested, original: 2 rows for one user after joining 420 then 360).
- A delayed/retried join delivered after the slot instant silently enrols the user into tomorrow's slot (follows from L57). Inference from code.
- Concurrency: `pg_advisory_xact_lock(hashtextextended(date:minute, 0))` serialises pairing per slot (L60). Postgres docs: transaction-level advisory locks are released automatically at transaction end; there is no manual unlock; session-level locks "do not honor transaction semantics" and stay held after rollback; advisory locks share a bounded lock table (`max_locks_per_transaction`). Source: [PostgreSQL: Explicit Locking - Advisory Locks](https://www.postgresql.org/docs/current/explicit-locking.html). The two-argument `pg_advisory_xact_lock(int, int)` key space does not overlap the one-argument `bigint` key space. Source: [PostgreSQL: System Administration Functions](https://www.postgresql.org/docs/current/functions-admin.html).
- The advisory lock is what prevents duplicate rows from two concurrent joins by the same user; `FOR UPDATE SKIP LOCKED` alone would not, because the second transaction cannot see the first's uncommitted insert. (Inference from the docs above: `SKIP LOCKED` skips already-locked rows only.)
- `leave_match` and `join_match` interact only through row locks (`leave_match` does not take the slot lock); no lock-order cycle exists in the original. Code observation.
- `mark_awake` uses `coalesce(a_awake_at, now())`, so replays are idempotent (first write wins). Code observation. But it has no time window: tested, a user could mark awake about 20 hours before the slot.

**Step 6 - Observability**
- No logging, no event table, no metrics, no audit trail beyond `reports`. `join_match` does not record whether a user got a partner, how long they waited, or whether the wake-up actually happened. Code observation.

**Cold-start fallback**
- Pairing is by exact `(match_date, wake_utc_minute)` (L66-68). Two users must choose the identical UTC minute on the same day; the time picker (`DateTimePickerAndroid`, `index.tsx` L93-103) allows any minute. With few users almost every join creates a waiting row that never pairs. Code observation.
- A user whose join returns `paired: false` sees an unpaired match; the code has no fallback (no widened window, no pooled/late pairing, no solo mode text). The client only reads `match.paired`. Code observation.

**Abuse / safety: stranger matching**
- Block and report exist (`block_and_report`) and the pairing query honours blocks in both directions (L69-72). This aligns with Google Play's UGC policy for apps with one-on-one interaction: in-app reporting of content/users is required for UGC apps; "Any feature enabling one-on-one interaction ... must include in-app blocking"; apps must have safeguards "against threats, harassment, and bullying, particularly toward minors"; children must be barred from apps that may contain sexual content via a neutral age screen or equivalent. Source: [Google Play: User Generated Content policy](https://support.google.com/googleplay/android-developer/answer/9876937).
- Google Play's Child Safety Standards page lists categories that "are required to use the Play Console functionality and tools to block minors", including apps whose core functionality is "randomly connecting users to spontaneously communicate" with strangers and apps where users "communicate anonymously where the identity of one or more users is deliberately hidden". Source: [Google Play Help 17036597](https://support.google.com/googleplay/android-developer/answer/17036597) (WebFetch summary; the visible portion gave no effective dates). Third-party sources claim these policy changes took effect 26 August 2026: [teltarif](https://www.teltarif.de/en/google-playstore-android/news/105633.html), [ecorpit](https://ecorpit.com/google-play-anonymous-chat-age-restricted-policy-august-2026/), [Medianama](https://www.medianama.com/2026/06/223-nudity-age-checks-anonymous-chat-apps-play-stores/) (not verified against Google's own text; Google's UGC page I fetched did not mention anonymous/random chat or dates).
- Wake Mate's schema contains no messaging, only an "awake" boolean per mate. Whether the Play "random/anonymous chat" categories apply therefore depends on whether the app has, or will add, any communication channel. Code observation + inference.
- Anonymous sign-in abuse: Supabase says anonymous users are stored in your database so abuse can inflate DB size and "strongly recommends" invisible CAPTCHA or Cloudflare Turnstile; default rate limit for anonymous sign-ins is 30 per hour per IP ("bursts up to 30"); customizable. Sources: [Anonymous Sign-Ins](https://supabase.com/docs/guides/auth/auth-anonymous), [Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits).
- No rate limit exists on any RPC. Tested on the new version: a limiter inserted per call blocked the 21st `join_match` in an hour (`PT429` custom SQLSTATE; mapping `PTnnn` to HTTP status is PostgREST behaviour from memory, not verified here).
- Because every reinstall / "clear data" creates a new anonymous uid, blocks are keyed to identities the blocked user can discard. Inference from `blocks(blocker, blocked)` on `auth.users.id` plus anonymous auth.

**Retention / privacy of anonymous users**
- Supabase: automatic cleanup of anonymous users "isn't available"; the docs show a manual SQL delete of anonymous users created more than 30 days ago. Source: [Anonymous Sign-Ins](https://supabase.com/docs/guides/auth/auth-anonymous) (WebFetch summary and search result agree; a 2024 launch blog said auto-cleanup was in progress: [blog](https://supabase.com/blog/anonymous-sign-ins), current docs do not list it). Note: filtering on `created_at` alone would delete active long-lived users; Wake Mate users keep a persisted anonymous session, so a last-activity column is needed. Tested: a purge keyed on own `last_seen` kept an active anonymous user created 40 days earlier and removed an inactive one.
- Wake Mate stores per user per day an exact wake time (`wake_utc_minute`) and awake timestamps, indefinitely; nothing deletes `matches`. This is a behavioural sleep-schedule record tied to a persistent pseudonymous id. Code observation. Whether it counts as personal data under a given law is not assessed here.
- `reports.reason` is unbounded free text, with no length CHECK. Code observation.

**Incident scenarios (design-time, derived from the above)**
- See Inferences.

### Inferences
Invariants to write down (and which are not yet enforced in `schema.sql`):
1. A user occupies at most one future slot. Not enforced; violated by changing the time (tested).
2. A paired match always has two distinct users (`user_a <> user_b`). Not enforced by a CHECK.
3. At rest, a slot has at most one waiting row (else two lonely users sit in the same slot). Violated in the original whenever a partner leaves; also true after my first patch version until `detach_user` re-paired waiting rows (found by a concurrency test).
4. Awake marks are only valid in the wake window. Not enforced.
5. Blocked pairs are never paired and are separated when a block is created. Only the first half is enforced.
6. Deleting a user never deletes someone else's match and never deletes safety evidence. Violated by FK cascades (tested).

Failure modes, with detect/surface/recover for the ones that matter:
- Join retry or double tap: idempotent by (user, slot); keep. Concurrent double join: serialise with a per-user lock then slot lock in a fixed order (tested: 3 runs x 16 clients x 20 joins, no deadlocks, invariants held).
- User changes time: detach from old slot, promote old partner to waiting and re-pair (tested).
- User churns or uninstalls with a waiting row: nothing detects it; a later joiner gets paired with a ghost. Needs a heartbeat or deferred pairing.
- Partner never wakes: client cannot tell "slept in" from "app gone"; handle in UX with an explicit timeout state at slot + N minutes.
- Backend down at alarm time: alarm still rings locally; the UI degrades to solo. Good property to preserve.

Authorization verdict: the row-level logic is correct (ownership checked inside each definer function; anon denied). The gaps are hardening (empty `search_path`, revoke table grants, narrow return type) and the fact that anonymous identity makes "authenticated" a weak gate, so rate limiting and attestation have to do the work that identity normally does.

Idempotence verdict: `join_match` is idempotent per (user, slot) but not per user intent; `mark_awake` idempotent; `leave_match` idempotent but silently no-ops on a paired match; `block_and_report` inserts a duplicate report per call (original), fixed by a unique index on `(reporter, match_id)`.

Concurrency verdict: the per-slot advisory lock is the right primitive for a greedy "first waiting row" pairing and also protects same-user duplicate joins; `SKIP LOCKED` is a throughput optimisation only worth considering if one slot gets heavy contention. Transaction-level locks (not session-level) are the safe choice with a pooled connection, because they cannot leak across pooled sessions (inference from the Postgres doc on session-level lock semantics; PgBouncer behaviour not checked).

Cold-start options, in increasing effort (design trade-offs, not measured):
1. Quantise slots to 15 minutes in SQL (tested: 07:14 and 07:01 requests pair in the same slot) and surface that in the UI.
2. Defer pairing: instead of greedy pair-on-join, a scheduled job at slot minus ~10 minutes pairs everyone waiting in the slot window (and neighbouring slots) with a nearest-minute heuristic, so odd counts leave one person, not many.
3. Explicit solo state: show "no mate today; we will keep trying" and keep the user as a waiting row eligible for late joiners until slot + 15 minutes.
4. A house/bot mate is a product-ethics decision (disclosure) and is not recommended without clear labelling.

Abuse / safety design:
- Minimum controls: neutral age gate (self-declared) recorded server-side and checked in `join_match`; `app_metadata`, not `user_metadata`, if stored in the JWT (user metadata is user-editable; stated from general Supabase knowledge, not fetched here); per-user rate limits; CAPTCHA/Turnstile on anonymous sign-in (Supabase recommendation); Play Integrity attestation on the client to raise the cost of mass account creation (not researched in this pass).
- Sybil/grief scenario: an attacker creating many anonymous accounts can fill waiting rows in popular slots, then pair with real users and never mark awake; a user can also probe which slots have waiting people because `join_match` reveals `paired`. Mitigated by rate limits, narrower return, and deferred pairing; not eliminated.
- Block semantics: block should (a) record the block, (b) record one report, (c) eject the reported user from the live match, (d) leave the reporter's slot intact and re-pair them (implemented and tested in the patch). Cross-identity enforcement (blocked user re-registering) cannot be solved in SQL; it needs an identity signal (device attestation, or require linking a Google account to match).
- Minors: if there is no communication feature, the exposure is small (a boolean "awake" signal), but the app still pairs strangers 1:1 and exposes identical wake schedules; decide the age policy before adding any chat/voice. Google Play's policy position is cited above.

Retention proposal (all implemented in the patch's `private.purge()` and tested for logic, not scheduled): delete `matches` older than 14 days; delete `private.rpc_calls` older than 2 days; delete `reports` older than 180 days; delete anonymous `auth.users` inactive for 30 days using an app-maintained `last_seen`. Retention periods are proposals, not legal advice. Schedule with pg_cron (`cron.schedule(...)`); pg_cron availability on the target Supabase project was not verified in this pass.

Observability to add (nothing implemented in the patch):
- Metrics/queries: joins per minute; pairing rate by slot; median time-to-pair; share of users who wake alone; share of paired users where both marked awake within 30 minutes; reports per day and per reported user; anonymous sign-ups per hour (spike alarm); `PT429` rate-limit hits; `pg_locks` advisory-lock waits and p95 `join_match` duration (e.g. via `pg_stat_statements`).
- Logs: one structured line per pairing decision (slot, outcome waiting/paired, wait time) written to a table or Postgres log without user ids in plain text where possible.
- Health: "healthy" = a synthetic anonymous user can join, see `my_current_match`, and leave within a time budget.

Incident scenarios and first response:
1. Anonymous sign-up flood: symptoms: auth.users growth, waiting rows spike, `PT429` hits. Response: enable CAPTCHA, lower the anonymous rate limit, run purge, temporarily disable anonymous sign-in, bulk delete accounts with no `user_activity`.
2. Harassment report spike or a coordinated report-bombing campaign: response: review `reports` grouped by `reported`; temporarily pause pairing for the flagged users via a denylist table checked in `join_match` (not in the current schema).
3. A hot slot (e.g. 07:00 UTC) becomes a lock queue: symptom: rising `join_match` latency, advisory lock waits. Response: quantised slots already reduce distinct keys but concentrate load; consider pairing in a scheduled batch instead of on-join.
4. Bad SQL deployment: `schema.sql` is run by hand in the SQL editor. `create or replace` cannot change a function's return type, so the patch drops and recreates; there is no migration history or rollback. Response: move to `supabase/migrations` before the next change (not researched in detail).
5. Data-subject deletion request or law-enforcement request for a user's matches: needs an owner-defined process; currently `matches` retention is infinite and reports are cascade-deleted with the account (tested).
6. Leaked project URL/anon key: not a secret by design; RLS and the RPC authorization are the only barrier, so the tested checks (anon denied, ownership inside each function) are the incident-time safeguard.
7. Play Console policy review rejects or removes the app for missing age screen or block/report visibility: preparation: in-app block/report is present; add the age gate and a privacy/data-safety answer for the stored wake schedule.

### Gaps
- All behaviour tests ran on stock PostgreSQL 16.15 with a stubbed `auth` schema, not Supabase (PostgREST, GoTrue, Supavisor, real default privileges). Default privileges on `public` were approximated with `alter default privileges ... grant all ... to anon, authenticated`. Supabase's actual Postgres major version and `public` schema CREATE privilege were not checked, so the exploitability of `search_path = public` in a real project is not established; the hardening is recommended on the basis of Supabase's own guidance, not a demonstrated exploit.
- Load was never given; no capacity numbers.
- Whether Wake Mate has or plans a chat/voice feature (which decides Play's "random chat / anonymous chat" minor-blocking categories) is unknown. The Google effective dates come only from third-party articles and were not confirmed on Google's pages.
- Whether Google Play requires an in-app account-deletion path for anonymous accounts was not researched.
- Play Integrity attestation, CAPTCHA wiring to `signInAnonymously`, and legal (GDPR/COPPA-type) analysis were not researched.
- The `component-architect` agent step of the skill was not available.

---

## Q3. Concrete bugs and risks in the existing schema, ranked, with proposed SQL fixes

### Takeaway
Fourteen findings. The highest-impact ones are (1) no daily re-enrolment so the feature works once, (2) exact-minute pairing that makes cold start fail, (3) users silently occupying several slots, (4) a paired user cannot leave and strands their partner, (5) block/report does not touch the live match and is bypassed by anonymous churn, (6) unbounded `mark_awake`, then hardening, abuse limits, cascade and retention issues. Everything marked "Tested" below is in `backend_design_patch_v2.sql` and ran green on PostgreSQL 16 including a pgbench concurrency run.

### Cited Findings
Ranking is by user-visible impact times likelihood. Evidence is code observation unless noted; the PostgreSQL and Supabase sources are those given in Q2.

**1. (High) No daily re-enrolment: the feature fires once per alarm change.**
Evidence: `joinMatch` is only called from `enable()` (`index.tsx` L77); a match is for one `match_date`; `my_current_match` returns nothing after 36 hours. DST shifts are never re-applied (`alarm.ts` L58-62). Not testable in SQL.
Fix (design; the sketch below is not run): store the standing alarm server-side and let a scheduled job create each day's enrolment; the client only sets/clears the alarm.
```sql
create table private.standing_alarm (
  user_id    uuid primary key references auth.users on delete cascade,
  tz         text not null,                -- IANA zone, e.g. 'Europe/Berlin'
  local_time time not null,
  enabled    boolean not null default true);
-- daily job (pg_cron): for each enabled alarm compute tomorrow's UTC minute with
--   ((current_date + 1 + local_time) at time zone tz) at time zone 'utc'
-- and call a private.join_core(user_id, utc_minute) refactored out of join_match.
```
Short-term alternative: the client calls the idempotent `join_match` on every app foreground when `alarm.on` (safe because same-slot joins return the existing row; tested).

**2. (High) Exact-minute pairing makes cold start nearly impossible.**
Evidence: `L66-68` pairs only on equal `wake_utc_minute`; the time picker allows any minute.
Fix, Tested (07:14 and 07:01 requests landed in the same 07:00 slot and paired): quantise to 15-minute slots inside `join_match`, preserving the requested lead time:
```sql
gran constant int := 15;
ahead := (p_utc_minute - nowm + 1440) % 1440;
if ahead < lead_min then ahead := ahead + 1440; end if;
slot := date_trunc('minute', now()) + make_interval(mins => ahead - (p_utc_minute % gran));
```
Further tiers (not implemented): deferred batch pairing at slot minus ~10 minutes with neighbouring-slot fallback; explicit solo UI state.

**3. (High) A user can sit in several slots; changing the time does not remove the old row.**
Evidence: no unique constraint; `join_match` only looks within the new slot (L62-64); client calls `leaveMatch` only if `!match.paired` and swallows errors (`index.tsx` L76). Tested on the original: after `join_match(420)` then `join_match(360)` user A had 2 rows; user B then paired with A's stale 07:00 slot, a person who would be awake at 06:00.
Fix, Tested (see patch, `join_match` + `private.detach_user`): per-user advisory lock first, then slot locks in ascending order, detach the user from every other future slot, promote and re-pair the abandoned partner.
```sql
perform private.user_lock(uid);
for r in select s from (select slot_at s from public.matches
                         where uid in (user_a,user_b) and slot_at > now()
                        union select slot) t order by s
loop perform private.slot_lock(r.s); end loop;
for r in select id from public.matches
          where uid in (user_a,user_b) and slot_at > now() and slot_at <> slot
loop perform private.detach_user(r.id, uid); end loop;
```
Needs new column `slot_at timestamptz not null` (backfilled from `match_date + wake_utc_minute`). Tested: A ends with 1 row; C changing slot demotes B to waiting.
A database-enforced alternative is a membership table `match_members(match_id, user_id, slot_at)` with `unique (user_id, slot_at)`; per-user "one future slot" still needs the detach logic because a unique constraint cannot express "one future slot".

**4. (High) A paired user cannot leave; the partner is stranded with a ghost.**
Evidence: `leave_match` deletes only `user_b is null and user_a = auth.uid()` (L106). Tested on the original: after pairing, `leave_match` returned without effect and the slot stayed paired. The client's "disable alarm" also does nothing when `match.paired` (`index.tsx` L88).
Fix, Tested: `leave_match` takes user lock, then the slot lock, then `detach_user`, which (a) deletes a waiting row owned by the caller, (b) promotes `user_b` to `user_a` and clears `user_b` if the caller is `user_a`, (c) clears `user_b` if the caller is `user_b`, (d) merges the resulting waiting row with another waiting row in the slot if compatible and not blocked.
```sql
-- core of private.detach_user (full function in the patch)
update public.matches set user_a = m.user_b, a_awake_at = m.b_awake_at,
       user_b = null, b_awake_at = null where id = m.id returning * into m;   -- caller was user_a
-- ...then absorb another waiting row x in the same slot:
update public.matches set user_b = x.user_a, b_awake_at = x.a_awake_at where id = m.id;
delete from public.matches where id = x.id;
```
Concurrency test finding: without step (d), slots ended with two waiting rows after one partner left (2 slots in the first pgbench run); with (d), 0 in 3 runs of 320 joins.

**5. (High) Block/report does not affect the current match, can be repeated, and is defeated by anonymous churn.**
Evidence: `block_and_report` inserts into `blocks` and `reports` only (L117-118); the UI says "You will not be matched with them again" (`index.tsx` L114) yet after blocking `refreshMatch` returns the same match. Tested on the original: after `block_and_report`, `my_current_match` still returned the same paired match. `reports` insert has no dedupe and `reason` is unbounded. Blocks are keyed to anonymous UUIDs, which a new install replaces.
Fix, Tested: eject the reported user from the live match, keep the reporter in the slot and re-pair them, dedupe reports, cap reason length:
```sql
alter table public.reports add constraint reports_reason_len check (char_length(reason) <= 500);
create unique index reports_once_idx on public.reports (reporter, match_id);
-- in block_and_report:
insert into public.blocks (blocker, blocked) values (uid, other) on conflict do nothing;
insert into public.reports (reporter, reported, match_id, reason)
  values (uid, other, m.id, left(p_reason, 500)) on conflict do nothing;
perform private.detach_user(m.id, other);
```
Tested: reporter then paired with another waiting user; blocked user could not re-pair with the reporter; a 900-character reason was stored as 500; second call was a no-op. Cross-account evasion is not fixable in SQL (see Q2 abuse section); it needs attestation or requiring a linked account.

**6. (High) `mark_awake` accepts "I'm up" at any time.**
Evidence: `L97-100` has no time check. Tested on the original: marked 20 hours before the slot, `b_awake_at` set.
Fix, Tested (returns false outside the window; replays still idempotent):
```sql
update public.matches set
  a_awake_at = case when user_a = uid then coalesce(a_awake_at, now()) else a_awake_at end,
  b_awake_at = case when user_b = uid then coalesce(b_awake_at, now()) else b_awake_at end
where id = p_match_id and uid in (user_a, user_b)
  and now() between slot_at - interval '10 minutes' and slot_at + interval '3 hours';
```
Note: self-reported awakeness remains unverifiable by design; the window only removes the trivial exploit.

**7. (Medium) SECURITY DEFINER hardening and over-broad exposure.**
Evidence: `set search_path = public` (not empty) on five functions; no `to authenticated` on the policy; table-level grants never revoked; the full row (including the partner's UUID) is returned. Supabase guidance in Q2 (prefer invoker; if definer, `search_path = ''`; revoke default grants; wrap `auth.uid()`).
Fix, Tested (anon still denied; authenticated has no direct table access; client gets only `id, slot_at, paired, me_awake, mate_awake`):
```sql
revoke all on public.matches, public.blocks, public.reports from anon, authenticated;
drop policy if exists "read own matches" on public.matches;
create type public.match_view as (id uuid, slot_at timestamptz, paired boolean, me_awake boolean, mate_awake boolean);
-- every function: language plpgsql security definer set search_path = ''  (all relations schema-qualified)
```
Client change: `toView` in `match.ts` no longer needs `ensureSession()` to compare UUIDs; map `me_awake`/`mate_awake` directly. Trade-off: no Realtime subscription on `matches` (the app polls anyway). If you keep table `select`, add `to authenticated` and `(select auth.uid())`. Note: after this patch the read RPC is still `security definer`; it could be `security invoker` only if you keep a select policy and grant.

**8. (Medium) No rate limiting; sybil and probe abuse.**
Evidence: nothing limits RPC frequency; `join_match` reveals `paired`, letting a client probe which slots have waiting users; anonymous sign-in is limited only per IP (30/hour default per Supabase docs).
Fix, Tested (21st call in an hour raised `PT429`; concurrent test hit the limit as designed):
```sql
create table private.rpc_calls (user_id uuid not null, fn text not null, at timestamptz not null default now());
create index on private.rpc_calls (user_id, fn, at);
create function private.rate_limit(p_uid uuid, p_fn text, p_max int, p_window interval) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from private.rpc_calls where user_id = p_uid and fn = p_fn and at > now() - p_window) >= p_max
  then raise exception 'rate limited' using errcode = 'PT429'; end if;
  insert into private.rpc_calls (user_id, fn) values (p_uid, p_fn);
end $$;
```
Also enable CAPTCHA/Turnstile for anonymous sign-ins (Supabase recommendation). Per-user limits do not stop an attacker creating many users; they raise cost per user only.

**9. (Medium) FK cascades delete the wrong things.**
Evidence/Tested on the original: deleting the `user_b` user removed the whole match; deleting the reported user removed their `reports`.
Fix, Tested: `user_b` -> `on delete set null`; drop the `reports.reporter` and `reports.reported` FKs so evidence survives account purge (retention then handled by an explicit age-based delete).
```sql
alter table public.matches drop constraint matches_user_b_fkey;
alter table public.matches add constraint matches_user_b_fkey
  foreign key (user_b) references auth.users(id) on delete set null;
alter table public.reports drop constraint reports_reporter_fkey, drop constraint reports_reported_fkey;
```
Tested: after deleting the former partner the slot row remained, `user_b` null. Trade-off: reports hold UUIDs of deleted users; that is personal-data retention to justify (see 11).
Residual: `user_a` is still `on delete cascade`; a deleted `user_a` removes the match including the partner's. Route account deletion through `private.detach_user` first (not implemented), or make `user_a` nullable and promote.

**10. (Medium) Abandoned waiting matches and ghost partners.**
Evidence: no cleanup of waiting rows; pairing prefers `order by created_at` (oldest waiting first, L73) so the stalest candidate is chosen, and a waiting user who uninstalled still counts. Not tested beyond logic.
Fix, partly Tested (purge only): `private.purge()` below; for ghost partners add a heartbeat (`private.user_activity.last_seen`, updated in join and mark_awake in the patch; a poll-driven heartbeat is not implemented) and prefer partners with recent `last_seen`, or pair in a batch just before the slot.

**11. (Medium) No retention for matches and reports; anonymous users accumulate.**
Evidence: nothing deletes data; Supabase offers no auto-cleanup of anonymous users.
Fix, Tested (function behaviour; the cron schedule line is commented out):
```sql
create function private.purge() returns void language sql security definer set search_path = '' as $$
  delete from public.matches    where slot_at < now() - interval '14 days';
  delete from private.rpc_calls where at < now() - interval '2 days';
  delete from public.reports    where created_at < now() - interval '180 days';
  delete from auth.users u where u.is_anonymous
    and coalesce((select a.last_seen from private.user_activity a where a.user_id = u.id), u.created_at)
        < now() - interval '30 days';
$$;
-- select cron.schedule('wakemate-purge','17 3 * * *', $$select private.purge()$$);
```
Tested: inactive anonymous deleted; active anonymous created 40 days ago kept; non-anonymous kept; 20-day-old match purged. Do not copy the docs' `created_at`-only filter. Deleting from `auth.users` privileges on a real Supabase project were not verified.

**12. (Low-Medium) Missing indexes and constraints.**
Evidence: FK child columns lack indexes (`blocks.blocked`, `reports.reporter/reported/match_id`) so cascading deletes (e.g. the purge) scan; the lookup index is not partial; no `user_a <> user_b`.
Fix (constraints and indexes applied in the patch; no performance measurement was done):
```sql
alter table public.matches add constraint matches_distinct_users check (user_b is null or user_a <> user_b);
create index matches_waiting_idx on public.matches (slot_at, created_at) where user_b is null;
create index blocks_blocked_idx  on public.blocks (blocked);
create index reports_reported_idx on public.reports (reported, created_at);
create index reports_match_idx   on public.reports (match_id);
```

**13. (Low-Medium) Date-boundary and lead-time logic.**
Evidence: see Q2 Step 3; no lead time, `my_current_match` ordering by `created_at`.
Fix, Tested (joining for the minute 3 minutes ahead rolls to the next day; slot instant computed as a timestamptz so UTC date rollover is handled by construction):
```sql
nowm  := extract(hour from now() at time zone 'utc')::int*60 + extract(minute from now() at time zone 'utc')::int;
ahead := (p_utc_minute - nowm + 1440) % 1440;
if ahead < lead_min then ahead := ahead + 1440; end if;   -- lead_min = 5
-- current match = earliest slot not older than 3 h
select ... from public.matches m
 where auth.uid() in (m.user_a, m.user_b) and m.slot_at > now() - interval '3 hours'
 order by m.slot_at limit 1;
```
DST still depends on client or the server-side standing alarm in item 1.

**14. (Low) Null/format handling and error codes.**
Evidence/Tested: `join_match(NULL)` raised a NOT NULL violation instead of "bad minute".
Fix, Tested: `if p_utc_minute is null or p_utc_minute not between 0 and 1439 then raise exception 'bad minute' using errcode = '22023'; end if;` and `using errcode = '28000'` for unauthenticated; custom `PT429` for rate limits so the client can distinguish them (PostgREST status mapping from memory, not fetched).

### Inferences
- Items 3, 4, 5 share one fix: a single `private.detach_user` primitive called from join, leave and block. This is the concrete benefit of step 2 of the skill (state the lifecycle and legal transitions) applied after the fact.
- Lock order rule used in the patch (important to keep when extending): per-user lock first, then slot locks in ascending slot order; row locks last. Tested with 16 concurrent clients for 3 runs of 320 joins each (960 transactions): no deadlock errors, zero users in more than one slot, zero rows with `user_a = user_b`, zero slots with more than one waiting row.
- The client change set needed alongside the SQL: parse the narrowed `match_view` in `match.ts`; handle `PT429`/`28000` errors instead of swallowing them (`.catch(() => undefined)` at `index.tsx` L76, L88, L108); call the idempotent join on foreground when the alarm is on (or move enrolment server-side); stop polling every 5 s outside the wake window (12 requests/minute per open client is the main read load; no number measured).
- Applying the patch on an existing database: `drop function` is needed because the return type changes from `public.matches` to `public.match_view`; there is a brief window with no functions inside the patch's single transaction, so it is atomic. Existing rows are backfilled for `slot_at`.
- What I verified in tests but did not verify on real Supabase: anon denied; direct table access denied; rate-limit error; idempotent re-join; change-time detach; leave while paired; block ejects reported user and re-pairs reporter; reason truncation; `user_b` deletion keeps the match; purge logic; concurrency invariants.

### Gaps
- No load or latency measurements; the lock queue behaviour at one hot slot (e.g. everyone at 07:00 UTC) was not tested beyond 16 clients over four slots.
- Deferred/batch pairing (the best cold-start fix) and the server-side standing alarm (item 1) are designs only; the SQL for item 1 is a sketch that was not run.
- pg_cron, `auth.users` delete privilege, PostgREST `PTnnn` status mapping, Supabase default grants and Postgres version on the target project were not checked against a real project.
- Cross-account block evasion has no SQL-level solution; the identity-strengthening options (Play Integrity, requiring a linked account, device-level bans) were identified but not researched.
- The client files reviewed beyond `match.ts` were `index.tsx` lines 30-130, `supabase.ts` lines 24-30 and `alarm.ts` lines 58-66 only; other client code (e.g. notification handling that might call join elsewhere) was covered by grep only.
