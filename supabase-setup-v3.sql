-- ============================================================
-- Sum-IT backend v3 — admins, blog-CMS, aanmeldingen-dashboard
-- Run ONCE in: Supabase Dashboard -> SQL Editor (na v1 en v2)
-- ============================================================

-- 1) Admins ---------------------------------------------------
create table if not exists public.admin_users (
  email      text primary key,
  added_by   text,
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;
revoke all on public.admin_users from anon, authenticated;

insert into public.admin_users(email, added_by) values
  ('ianbouman01@gmail.com','seed'),
  ('admin.alpha.nova@gmail.com','seed')
on conflict (email) do nothing;

create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.admin_users
                  where email = lower(coalesce(auth.jwt()->>'email','')));
$$;
grant execute on function public.is_admin() to authenticated;
revoke all on function public.is_admin() from public, anon;

-- content_overrides write policy now via admin_users table
drop policy if exists "authenticated can write content" on public.content_overrides;
drop policy if exists "admins can write content" on public.content_overrides;
create policy "admins can write content"
  on public.content_overrides
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Admins beheren (alleen door admins)
create or replace function public.admin_list_admins()
returns setof public.admin_users language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return query select * from public.admin_users order by created_at;
end $$;
create or replace function public.admin_add_admin(p_email text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  insert into public.admin_users(email, added_by)
  values (lower(trim(p_email)), lower(auth.jwt()->>'email'))
  on conflict (email) do nothing;
end $$;
create or replace function public.admin_remove_admin(p_email text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  if lower(trim(p_email)) = lower(auth.jwt()->>'email') then
    raise exception 'cannot remove yourself';
  end if;
  delete from public.admin_users where email = lower(trim(p_email));
end $$;
grant execute on function public.admin_list_admins() to authenticated;
grant execute on function public.admin_add_admin(text) to authenticated;
grant execute on function public.admin_remove_admin(text) to authenticated;
revoke all on function public.admin_list_admins() from public, anon;
revoke all on function public.admin_add_admin(text) from public, anon;
revoke all on function public.admin_remove_admin(text) from public, anon;

-- 2) Blog-CMS -------------------------------------------------
create table if not exists public.blog_posts (
  slug        text primary key check (slug ~ '^[a-z0-9-]{3,80}$'),
  title       text not null,
  description text not null default '',
  body_html   text not null default '',
  author      text not null default 'Sum-IT',
  published   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.blog_posts enable row level security;

drop policy if exists "public reads published posts" on public.blog_posts;
create policy "public reads published posts"
  on public.blog_posts for select
  using (published = true);

drop policy if exists "admins manage posts" on public.blog_posts;
create policy "admins manage posts"
  on public.blog_posts for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.touch_blog_posts()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_touch_blog_posts on public.blog_posts;
create trigger trg_touch_blog_posts
  before update on public.blog_posts
  for each row execute function public.touch_blog_posts();

-- 3) Aanmeldingen-dashboard (alleen admins) -------------------
create or replace function public.admin_signups()
returns table (id bigint, email text, naam text, rol text, bedrijfstype text,
               boekhouder text, taal text, source text, city text, ref_code text,
               referred_by text, status text, queue_pos integer,
               confirmed_at timestamptz, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return query select s.id, s.email, s.naam, s.rol, s.bedrijfstype, s.boekhouder,
                      s.taal, s.source, s.city, s.ref_code, s.referred_by,
                      s.status, s.queue_pos, s.confirmed_at, s.created_at
                 from public.signups s order by s.created_at desc;
end $$;
grant execute on function public.admin_signups() to authenticated;
revoke all on function public.admin_signups() from public, anon;

create or replace function public.admin_signup_stats()
returns json language plpgsql security definer set search_path = public as $$
declare v json;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  select json_build_object(
    'total',      count(*),
    'confirmed',  count(*) filter (where status='confirmed'),
    'pending',    count(*) filter (where status='pending'),
    'unsub',      count(*) filter (where status='unsubscribed'),
    'bookkeepers',count(*) filter (where rol='boekhouder'),
    'referred',   count(*) filter (where referred_by is not null),
    'last7',      count(*) filter (where created_at > now() - interval '7 days')
  ) into v from public.signups;
  return v;
end $$;
grant execute on function public.admin_signup_stats() to authenticated;
revoke all on function public.admin_signup_stats() from public, anon;

-- 4) Welkomstmail éénmalig-garantie (v3.1) -------------------
alter table public.signups add column if not exists welcomed_at timestamptz;
create or replace function public.mark_welcomed(p_email text)
returns boolean language plpgsql security definer set search_path = public as $$
declare hit int;
begin
  update public.signups set welcomed_at = now()
   where email = lower(p_email) and welcomed_at is null and status = 'confirmed';
  get diagnostics hit = row_count;
  return hit > 0;
end $$;
revoke all on function public.mark_welcomed(text) from public, anon, authenticated;

-- 5) Admin: verwijderen uit de wachtrij (v3.2) ----------------
create or replace function public.admin_delete_signup(p_id bigint)
returns void language plpgsql security definer set search_path = public as $$
declare v_code text;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  select ref_code into v_code from public.signups where id = p_id;
  if v_code is null then raise exception 'signup not found'; end if;
  update public.signups set referred_by = null where referred_by = v_code;
  delete from public.signups where id = p_id;
end $$;
grant execute on function public.admin_delete_signup(bigint) to authenticated;
revoke all on function public.admin_delete_signup(bigint) from public, anon;
