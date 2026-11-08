-- Wake Mate backend. Run in the Supabase SQL editor.
-- Also enable: Authentication > Providers > "Allow anonymous sign-ins".

create table if not exists public.matches (
  id              uuid primary key default gen_random_uuid(),
  match_date      date not null,                 -- UTC date of the wake-up
  wake_utc_minute int  not null check (wake_utc_minute between 0 and 1439),
  user_a          uuid not null references auth.users on delete cascade,
  user_b          uuid references auth.users on delete cascade,  -- null while waiting
  a_awake_at      timestamptz,
  b_awake_at      timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists matches_lookup_idx on public.matches (match_date, wake_utc_minute);
create index if not exists matches_user_a_idx on public.matches (user_a);
create index if not exists matches_user_b_idx on public.matches (user_b);

create table if not exists public.blocks (
  blocker uuid not null references auth.users on delete cascade,
  blocked uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter uuid not null references auth.users on delete cascade,
  reported uuid not null references auth.users on delete cascade,
  match_id uuid references public.matches on delete set null,
  reason text,
  created_at timestamptz not null default now()
);

alter table public.matches enable row level security;
alter table public.blocks  enable row level security;
alter table public.reports enable row level security;

-- Users can only read their own matches. All writes go through the functions below.
drop policy if exists "read own matches" on public.matches;
create policy "read own matches" on public.matches
  for select using (auth.uid() in (user_a, user_b));

-- Join (or create) a match for the next occurrence of a UTC wake-up minute.
create or replace function public.join_match(p_utc_minute int)
returns public.matches
language plpgsql security definer set search_path = public as $$
declare
  uid  uuid := auth.uid();
  nowm int  := extract(hour from now() at time zone 'utc')::int * 60
               + extract(minute from now() at time zone 'utc')::int;
  d    date;
  m    public.matches;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if p_utc_minute not between 0 and 1439 then raise exception 'bad minute'; end if;

  d := (now() at time zone 'utc')::date + case when p_utc_minute > nowm then 0 else 1 end;

  -- Serialise pairing per wake slot so two people never grab the same partner.
  perform pg_advisory_xact_lock(hashtextextended(d::text || ':' || p_utc_minute, 0));

  select * into m from matches
   where match_date = d and wake_utc_minute = p_utc_minute and uid in (user_a, user_b);
  if found then return m; end if;

  select * into m from matches
   where match_date = d and wake_utc_minute = p_utc_minute
     and user_b is null and user_a <> uid
     and not exists (
       select 1 from blocks b
        where (b.blocker = uid and b.blocked = matches.user_a)
           or (b.blocker = matches.user_a and b.blocked = uid))
   order by created_at limit 1
   for update;
  if found then
    update matches set user_b = uid where id = m.id returning * into m;
    return m;
  end if;

  insert into matches (match_date, wake_utc_minute, user_a)
  values (d, p_utc_minute, uid) returning * into m;
  return m;
end $$;

-- The caller's most recent match from the last 36 hours.
create or replace function public.my_current_match()
returns public.matches
language sql stable security definer set search_path = public as $$
  select * from matches
   where auth.uid() in (user_a, user_b) and created_at > now() - interval '36 hours'
   order by created_at desc limit 1;
$$;

create or replace function public.mark_awake(p_match_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update matches set
    a_awake_at = case when user_a = auth.uid() then coalesce(a_awake_at, now()) else a_awake_at end,
    b_awake_at = case when user_b = auth.uid() then coalesce(b_awake_at, now()) else b_awake_at end
  where id = p_match_id and auth.uid() in (user_a, user_b);
end $$;

-- Cancel a waiting match (user switched off / changed their alarm).
create or replace function public.leave_match(p_match_id uuid)
returns void language sql security definer set search_path = public as $$
  delete from matches where id = p_match_id and user_b is null and user_a = auth.uid();
$$;

create or replace function public.block_and_report(p_match_id uuid, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare m matches; other uuid;
begin
  select * into m from matches where id = p_match_id and auth.uid() in (user_a, user_b);
  if not found then return; end if;
  other := case when m.user_a = auth.uid() then m.user_b else m.user_a end;
  if other is null then return; end if;
  insert into blocks (blocker, blocked) values (auth.uid(), other) on conflict do nothing;
  insert into reports (reporter, reported, match_id, reason) values (auth.uid(), other, m.id, p_reason);
end $$;

revoke all on function public.join_match, public.my_current_match, public.mark_awake,
  public.leave_match, public.block_and_report from public, anon;
grant execute on function public.join_match, public.my_current_match, public.mark_awake,
  public.leave_match, public.block_and_report to authenticated;
