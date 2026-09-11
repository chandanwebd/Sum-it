-- ============================================================
-- Sum-IT backend v2 — Founding 500 waitlist, referrals, portal
-- Run ONCE in: Supabase Dashboard -> SQL Editor -> New query -> Run
-- (Run supabase-setup.sql FIRST — that one creates the content CMS.)
-- ============================================================

-- 1) Waitlist ------------------------------------------------
create sequence if not exists queue_seq start 1;

create table if not exists public.signups (
  id            bigint generated always as identity primary key,
  email         text not null unique,
  naam          text not null,
  rol           text not null default 'ondernemer' check (rol in ('ondernemer','boekhouder')),
  bedrijfstype  text,
  boekhouder    text check (boekhouder in ('ja','nee')),
  taal          text not null default 'nl' check (taal in ('nl','en')),
  source        text not null default 'site',
  city          text,
  ref_code      text not null unique,
  referred_by   text references public.signups(ref_code),
  status        text not null default 'pending' check (status in ('pending','confirmed','unsubscribed')),
  queue_pos     integer unique,
  confirmed_at  timestamptz,
  created_at    timestamptz not null default now(),
  ip_hash       text,
  rank          text not null default 'founding_member'
);
create index if not exists signups_referred_by_idx on public.signups(referred_by);
create index if not exists signups_ip_created_idx  on public.signups(ip_hash, created_at);

-- Lock the table down: no direct API access at all.
-- The Cloudflare Functions use the service key (bypasses RLS);
-- the portal uses the SECURITY DEFINER functions below.
alter table public.signups enable row level security;
revoke all on public.signups from anon, authenticated;

-- 2) Confirmation (called by the Laposta webhook) ------------
create or replace function public.confirm_signup(p_email text)
returns table (queue_pos integer, ref_code text, taal text)
language plpgsql security definer set search_path = public as $$
begin
  update public.signups s
     set status = 'confirmed',
         confirmed_at = coalesce(s.confirmed_at, now()),
         queue_pos = coalesce(s.queue_pos, nextval('queue_seq')::integer)
   where s.email = lower(p_email) and s.status <> 'confirmed';
  return query select s.queue_pos, s.ref_code, s.taal
    from public.signups s where s.email = lower(p_email);
end $$;
revoke all on function public.confirm_signup(text) from public, anon, authenticated;

create or replace function public.unsubscribe_signup(p_email text)
returns void language sql security definer set search_path = public as $$
  update public.signups set status = 'unsubscribed' where email = lower(p_email);
$$;
revoke all on function public.unsubscribe_signup(text) from public, anon, authenticated;

-- 3) Portal (logged-in members, via Supabase Auth) -----------
create or replace function public.portal_me()
returns json language plpgsql security definer set search_path = public as $$
declare me public.signups; refs integer;
begin
  select * into me from public.signups where email = lower(auth.jwt()->>'email');
  if me.id is null then return null; end if;
  select count(*) into refs from public.signups
   where referred_by = me.ref_code and status = 'confirmed';
  return json_build_object(
    'naam', me.naam, 'status', me.status, 'queue_pos', me.queue_pos,
    'ref_code', me.ref_code, 'referred_confirmed', refs,
    'rol', me.rol, 'rank', me.rank, 'city', me.city, 'taal', me.taal);
end $$;
grant execute on function public.portal_me() to authenticated;
revoke all on function public.portal_me() from public, anon;

create or replace function public.portal_set_city(p_city text)
returns void language sql security definer set search_path = public as $$
  update public.signups set city = nullif(trim(p_city), '')
   where email = lower(auth.jwt()->>'email');
$$;
grant execute on function public.portal_set_city(text) to authenticated;
revoke all on function public.portal_set_city(text) from public, anon;

-- 4) Public counters (served through /api/stats/public) ------
create or replace function public.public_stats()
returns json language plpgsql security definer set search_path = public as $$
declare v_claimed int; v_book int; v_cities json; v_trades json;
begin
  select count(*) into v_claimed from public.signups where status='confirmed';
  select count(*) into v_book    from public.signups where status='confirmed' and rol='boekhouder';
  select coalesce(json_object_agg(c.city, c.n), '{}'::json) into v_cities
    from (select city, count(*) n from public.signups
           where status='confirmed' and city is not null
           group by city having count(*) >= 3) c;
  select coalesce(json_object_agg(t.bedrijfstype, t.n), '{}'::json) into v_trades
    from (select bedrijfstype, count(*) n from public.signups
           where status='confirmed' and bedrijfstype is not null
           group by bedrijfstype having count(*) >= 3) t;
  return json_build_object('claimed', v_claimed, 'bookkeepers', v_book,
                           'cities', v_cities, 'trades', v_trades);
end $$;
revoke all on function public.public_stats() from public, anon, authenticated;

-- 5) Hygiene: purge never-confirmed signups older than 30 days
--    Enable pg_cron in Dashboard -> Database -> Extensions, then:
-- select cron.schedule('purge-pending', '0 4 * * *',
--   $$delete from public.signups where status='pending' and created_at < now() - interval '30 days'$$);
