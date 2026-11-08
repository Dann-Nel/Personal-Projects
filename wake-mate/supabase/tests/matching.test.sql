\set ON_ERROR_STOP on
create temp table u(n int primary key, id uuid);
insert into auth.users (id) select gen_random_uuid() from generate_series(1,5);
insert into u select row_number() over (), id from auth.users;
create or replace function pg_temp.as_user(n int) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', (select id::text from u where u.n = $1), false); end $$;
create or replace function pg_temp.assert(ok boolean, msg text) returns void language plpgsql as $$
begin if not ok then raise exception 'FAIL: %', msg; else raise notice 'ok: %', msg; end if; end $$;

-- target wake minute ~2h from now, floored to a quarter hour
select (((extract(hour from now() at time zone 'utc')::int*60 + extract(minute from now() at time zone 'utc')::int) + 120) % 1440) as m \gset
select :m - (:m % 15) as base \gset
select case when :base > 1400 then 600 else :base end as base \gset

select pg_temp.as_user(1);
create temp table r1 as select * from public.join_match(:base + 14);
select pg_temp.assert(not (select paired from r1), 'first joiner waits');
select pg_temp.as_user(2);
create temp table r2 as select * from public.join_match(:base);
select pg_temp.assert((select paired from r2), 'second joiner in same 15-min slot is paired (07:14 vs 07:00)');
select pg_temp.assert((select slot_at from r2) > now() + interval '1 hour', 'slot is in the future');
select pg_temp.as_user(1);
select pg_temp.assert((select paired from public.my_current_match()), 'user1 sees paired');

-- third and fourth user pair with each other, not with a full slot
select pg_temp.as_user(3); select * from public.join_match(:base + 7);
select pg_temp.assert(not (select paired from public.my_current_match()), 'third user waits (slot has a pair)');
select pg_temp.as_user(4); select * from public.join_match(:base + 3);
select pg_temp.assert((select paired from public.my_current_match()), 'fourth user pairs with third');

-- user1 changes time: only one future slot per user; user2 becomes waiting
select pg_temp.as_user(1); select * from public.join_match(:base + 30);
select pg_temp.assert((select count(*) from public.matches where (select id from u where n=1) in (user_a,user_b)) = 1, 'user1 holds exactly one slot');
select pg_temp.as_user(2);
select pg_temp.assert(not (select paired from public.my_current_match()), 'user2 demoted to waiting after partner left');

-- user2 joins user1's new slot
select * from public.join_match(:base + 30);
select pg_temp.assert((select paired from public.my_current_match()), 'user2 re-pairs in the new slot');

-- block/report: user3 reports user4; user4 ejected, user3 keeps slot waiting
select pg_temp.as_user(3);
select id as mid from public.my_current_match() \gset
select public.block_and_report(:'mid'::uuid, repeat('x', 900));
select pg_temp.assert((select count(*) from public.blocks) = 1, 'block recorded');
select pg_temp.assert((select char_length(reason) from public.reports) = 500, 'report reason capped at 500');
select pg_temp.assert(not (select paired from public.my_current_match()), 'reporter waits after ejecting mate');
select pg_temp.as_user(4);
select pg_temp.assert(not coalesce((select paired from public.my_current_match()), false), 'reported user no longer paired with reporter');

-- blocked users are not re-paired
select * from public.join_match(:base + 5);
select pg_temp.assert(not (select paired from public.my_current_match()), 'blocked pair is not re-matched');

-- check-in window
select pg_temp.as_user(1);
select id as mid1 from public.my_current_match() \gset
select pg_temp.assert(public.mark_awake(:'mid1'::uuid) = false, 'cannot check in 2h before the slot');

-- slot never in the past, even for the minute right now
select pg_temp.as_user(5);
select (extract(hour from now() at time zone 'utc')::int*60 + extract(minute from now() at time zone 'utc')::int) as nowm \gset
create temp table r5 as select * from public.join_match(:nowm);
select pg_temp.assert((select slot_at from r5) > now() + interval '4 minutes', 'joining the current minute enrols tomorrow, never the past');

-- validation
do $$ begin
  begin perform public.join_match(null); raise exception 'FAIL: null accepted';
  exception when sqlstate '22023' then raise notice 'ok: null minute rejected'; end;
  begin perform public.join_match(2000); raise exception 'FAIL: 2000 accepted';
  exception when sqlstate '22023' then raise notice 'ok: out-of-range minute rejected'; end;
end $$;

-- rate limit
select pg_temp.as_user(5);
do $$ declare i int; begin
  for i in 1..25 loop
    begin perform public.join_match((i*15) % 1440);
    exception when sqlstate 'PT429' then raise notice 'ok: rate limited at call %', i; return; end;
  end loop; raise exception 'FAIL: never rate limited'; end $$;
