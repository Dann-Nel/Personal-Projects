-- Wake Mate backend patch v2 (apply on top of supabase/schema.sql)
begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ---------- data model ----------
alter table public.matches add column if not exists slot_at timestamptz;
update public.matches
   set slot_at = (match_date::timestamp + make_interval(mins => wake_utc_minute)) at time zone 'UTC'
 where slot_at is null;
alter table public.matches alter column slot_at set not null;

alter table public.matches drop constraint if exists matches_distinct_users;
alter table public.matches add  constraint matches_distinct_users check (user_b is null or user_a <> user_b);

-- partner leaving must not delete the other person's match
alter table public.matches drop constraint if exists matches_user_b_fkey;
alter table public.matches add  constraint matches_user_b_fkey
  foreign key (user_b) references auth.users(id) on delete set null;

-- reports are evidence: keep them when an anonymous account is purged
alter table public.reports drop constraint if exists reports_reporter_fkey;
alter table public.reports drop constraint if exists reports_reported_fkey;
alter table public.reports drop constraint if exists reports_reason_len;
alter table public.reports add  constraint reports_reason_len check (char_length(reason) <= 500);
create unique index if not exists reports_once_idx on public.reports (reporter, match_id);

create index if not exists matches_waiting_idx on public.matches (slot_at, created_at) where user_b is null;
create index if not exists blocks_blocked_idx  on public.blocks  (blocked);
create index if not exists reports_reported_idx on public.reports (reported, created_at);
create index if not exists reports_match_idx   on public.reports (match_id);

create table if not exists private.user_activity (
  user_id uuid primary key references auth.users on delete cascade,
  last_seen timestamptz not null default now());
create table if not exists private.rpc_calls (
  user_id uuid not null, fn text not null, at timestamptz not null default now());
create index if not exists rpc_calls_idx on private.rpc_calls (user_id, fn, at);

-- ---------- lock down direct table access; RPC only ----------
drop policy if exists "read own matches" on public.matches;
revoke all on public.matches, public.blocks, public.reports from anon, authenticated;

-- ---------- return type that never exposes the mate's uid ----------
drop function if exists public.join_match(int), public.my_current_match(), public.mark_awake(uuid),
  public.leave_match(uuid), public.block_and_report(uuid, text);
do $$ begin
  create type public.match_view as (id uuid, slot_at timestamptz, paired boolean, me_awake boolean, mate_awake boolean);
exception when duplicate_object then null; end $$;

-- ---------- private helpers ----------
create or replace function private.to_view(m public.matches, p_uid uuid)
returns public.match_view language sql immutable set search_path = '' as $$
  select m.id, m.slot_at, m.user_b is not null,
         (case when m.user_a = p_uid then m.a_awake_at else m.b_awake_at end) is not null,
         (case when m.user_a = p_uid then m.b_awake_at else m.a_awake_at end) is not null
$$;

create or replace function private.user_lock(p_uid uuid) returns void
language sql set search_path = '' as $$
  select pg_advisory_xact_lock(hashtext('wakemate.user'), hashtext(p_uid::text))
$$;
create or replace function private.slot_lock(p_slot timestamptz) returns void
language sql set search_path = '' as $$
  select pg_advisory_xact_lock(hashtext('wakemate.slot'), (extract(epoch from p_slot)::bigint / 60)::int)
$$;

create or replace function private.rate_limit(p_uid uuid, p_fn text, p_max int, p_window interval)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from private.rpc_calls where user_id = p_uid and fn = p_fn and at > now() - p_window) >= p_max then
    raise exception 'rate limited' using errcode = 'PT429';
  end if;
  insert into private.rpc_calls (user_id, fn) values (p_uid, p_fn);
end $$;

-- Remove one user from a match. Caller must hold the slot lock.
-- The remaining partner is demoted to a waiting match and immediately re-paired
-- with any other compatible waiting row in the same slot (no stranded singles).
create or replace function private.detach_user(p_match uuid, p_uid uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare m public.matches; x public.matches;
begin
  select * into m from public.matches where id = p_match for update;
  if not found then return; end if;
  if m.user_b is null then
    if m.user_a = p_uid then delete from public.matches where id = m.id; end if;
    return;
  elsif m.user_a = p_uid then
    update public.matches set user_a = m.user_b, a_awake_at = m.b_awake_at, user_b = null, b_awake_at = null
     where id = m.id returning * into m;
  elsif m.user_b = p_uid then
    update public.matches set user_b = null, b_awake_at = null where id = m.id returning * into m;
  else
    return;
  end if;
  -- m is now a waiting row; absorb another waiting row if one exists
  select * into x from public.matches xx
   where xx.slot_at = m.slot_at and xx.user_b is null and xx.id <> m.id and xx.user_a <> m.user_a
     and not exists (select 1 from public.blocks b
                      where (b.blocker = m.user_a and b.blocked = xx.user_a)
                         or (b.blocker = xx.user_a and b.blocked = m.user_a))
   order by xx.created_at limit 1 for update;
  if found then
    update public.matches set user_b = x.user_a, b_awake_at = x.a_awake_at where id = m.id;
    delete from public.matches where id = x.id;
  end if;
end $$;

-- ---------- public RPCs ----------
create or replace function public.join_match(p_utc_minute int)
returns public.match_view
language plpgsql security definer set search_path = '' as $$
declare
  uid  uuid := auth.uid();
  lead_min constant int := 5;     -- do not enrol into a slot that starts sooner than this
  gran     constant int := 15;    -- slot granularity: cold-start fix, pair people within the same quarter hour
  nowm int; ahead int; slot timestamptz; r record; m public.matches;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if p_utc_minute is null or p_utc_minute not between 0 and 1439 then
    raise exception 'bad minute' using errcode = '22023';
  end if;

  perform private.user_lock(uid);                       -- 1) per-user, always first
  perform private.rate_limit(uid, 'join', 20, interval '1 hour');
  insert into private.user_activity (user_id) values (uid)
    on conflict (user_id) do update set last_seen = now();

  nowm  := extract(hour from now() at time zone 'utc')::int * 60 + extract(minute from now() at time zone 'utc')::int;
  ahead := (p_utc_minute - nowm + 1440) % 1440;
  if ahead < lead_min then ahead := ahead + 1440; end if;
  slot  := date_trunc('minute', now()) + make_interval(mins => ahead - (p_utc_minute % gran));

  -- 2) slot locks in ascending order (target slot + every other future slot I'm in) => no deadlocks
  for r in
    select s from (select slot_at as s from public.matches
                    where uid in (user_a, user_b) and slot_at > now()
                   union select slot) t order by s
  loop
    perform private.slot_lock(r.s);
  end loop;

  -- one future slot per user: leaving the others (promotes their partners back to waiting)
  for r in select id from public.matches where uid in (user_a, user_b) and slot_at > now() and slot_at <> slot loop
    perform private.detach_user(r.id, uid);
  end loop;

  select * into m from public.matches where slot_at = slot and uid in (user_a, user_b);
  if not found then
    select * into m from public.matches mm
     where mm.slot_at = slot and mm.user_b is null and mm.user_a <> uid
       and not exists (select 1 from public.blocks b
                        where (b.blocker = uid and b.blocked = mm.user_a)
                           or (b.blocker = mm.user_a and b.blocked = uid))
     order by mm.created_at limit 1 for update;
    if found then
      update public.matches set user_b = uid where id = m.id returning * into m;
    else
      insert into public.matches (match_date, wake_utc_minute, slot_at, user_a)
      values ((slot at time zone 'utc')::date,
              extract(hour from slot at time zone 'utc')::int * 60 + extract(minute from slot at time zone 'utc')::int,
              slot, uid)
      returning * into m;
    end if;
  end if;
  return private.to_view(m, uid);
end $$;

create or replace function public.my_current_match()
returns public.match_view
language sql stable security definer set search_path = '' as $$
  select private.to_view(m, auth.uid())
    from public.matches m
   where auth.uid() in (m.user_a, m.user_b) and m.slot_at > now() - interval '3 hours'
   order by m.slot_at limit 1
$$;

create or replace function public.mark_awake(p_match_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); n int;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  update public.matches set
    a_awake_at = case when user_a = uid then coalesce(a_awake_at, now()) else a_awake_at end,
    b_awake_at = case when user_b = uid then coalesce(b_awake_at, now()) else b_awake_at end
  where id = p_match_id and uid in (user_a, user_b)
    and now() between slot_at - interval '10 minutes' and slot_at + interval '3 hours';
  get diagnostics n = row_count;
  if n > 0 then
    insert into private.user_activity (user_id) values (uid) on conflict (user_id) do update set last_seen = now();
  end if;
  return n > 0;
end $$;

create or replace function public.leave_match(p_match_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); s timestamptz;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  perform private.user_lock(uid);
  select slot_at into s from public.matches where id = p_match_id and uid in (user_a, user_b);
  if not found or s <= now() then return; end if;
  perform private.slot_lock(s);
  perform private.detach_user(p_match_id, uid);
end $$;

create or replace function public.block_and_report(p_match_id uuid, p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); m public.matches; other uuid;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  perform private.user_lock(uid);
  perform private.rate_limit(uid, 'report', 30, interval '1 day');
  select * into m from public.matches where id = p_match_id and uid in (user_a, user_b);
  if not found then return; end if;
  other := case when m.user_a = uid then m.user_b else m.user_a end;
  if other is null then return; end if;
  perform private.slot_lock(m.slot_at);
  insert into public.blocks (blocker, blocked) values (uid, other) on conflict do nothing;
  insert into public.reports (reporter, reported, match_id, reason)
    values (uid, other, m.id, left(p_reason, 500)) on conflict do nothing;
  perform private.detach_user(m.id, other);   -- eject the reported user; the reporter keeps the slot and re-pairs
end $$;

revoke all on function public.join_match(int), public.my_current_match(), public.mark_awake(uuid),
  public.leave_match(uuid), public.block_and_report(uuid, text) from public, anon;
grant execute on function public.join_match(int), public.my_current_match(), public.mark_awake(uuid),
  public.leave_match(uuid), public.block_and_report(uuid, text) to authenticated;

-- ---------- retention ----------
create or replace function private.purge() returns void
language sql security definer set search_path = '' as $$
  delete from public.matches    where slot_at < now() - interval '14 days';
  delete from private.rpc_calls where at < now() - interval '2 days';
  delete from public.reports    where created_at < now() - interval '180 days';
  delete from auth.users u
   where u.is_anonymous
     and coalesce((select a.last_seen from private.user_activity a where a.user_id = u.id), u.created_at)
         < now() - interval '30 days';
$$;
-- select cron.schedule('wakemate-purge', '17 3 * * *', $$select private.purge()$$);   -- requires pg_cron

commit;
