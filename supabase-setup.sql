-- ============================================================
-- Sum-IT content backend — Supabase setup
-- Run this once in:  Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- 1) Table that stores text overrides for the website.
--    Each row overrides one translation key, in one language.
--    The website's built-in text is the fallback; rows here win.
create table if not exists public.content_overrides (
  lang        text        not null check (lang in ('en','nl','de')),
  key         text        not null,
  value       text        not null,
  updated_at  timestamptz not null default now(),
  primary key (lang, key)
);

-- keep updated_at fresh on every change
create or replace function public.touch_content_overrides()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_touch_content_overrides on public.content_overrides;
create trigger trg_touch_content_overrides
  before update on public.content_overrides
  for each row execute function public.touch_content_overrides();

-- 2) Row Level Security: anyone can READ (so the public site can load
--    your edits), but only a LOGGED-IN user can write/change/delete.
alter table public.content_overrides enable row level security;

drop policy if exists "public can read content" on public.content_overrides;
create policy "public can read content"
  on public.content_overrides
  for select
  using (true);

-- Only ADMIN accounts may write (portal members are also 'authenticated'!):
drop policy if exists "authenticated can write content" on public.content_overrides;
drop policy if exists "admins can write content" on public.content_overrides;
create policy "admins can write content"
  on public.content_overrides
  for all
  to authenticated
  using (lower(auth.jwt()->>'email') in ('ianbouman01@gmail.com','admin.alpha.nova@gmail.com'))
  with check (lower(auth.jwt()->>'email') in ('ianbouman01@gmail.com','admin.alpha.nova@gmail.com'));
-- (voeg hier extra admin-e-mails toe en run dit blok opnieuw)

-- ============================================================
-- 3) Create your admin login (do this in the dashboard, NOT here):
--    Authentication → Users → "Add user" → enter your email + a
--    password → tick "Auto Confirm User". That email + password is
--    what you'll type into admin.html to log in.
-- ============================================================
