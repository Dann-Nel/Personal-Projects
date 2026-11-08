\set ON_ERROR_STOP off
set role authenticated;
select 'direct select should be denied:' as t; select * from public.matches limit 1;
select 'direct insert should be denied:' as t; insert into public.matches(match_date,wake_utc_minute,slot_at,user_a) values (now(),1,now(),gen_random_uuid());
reset role; set role anon;
select 'anon rpc should be denied:' as t; select * from public.join_match(100);
