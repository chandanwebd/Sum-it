-- ============================================================
-- Sum-IT BLOG project — complete setup for a NEW, empty Supabase project
-- that only hosts the blog CMS (/blog/ + /admin/blogs/).
--
-- Run ONCE in: Supabase Dashboard -> SQL Editor -> New query -> Run.
-- Idempotent: safe to re-run. Contains everything the blog needs from
-- supabase-setup-v3.sql (admins, blog_posts), -v5.sql (blocks, images, SEO)
-- and -v6.sql (status, id, canonical, featured). Do NOT also run those files
-- on this project; they belong to the main project (sign-ups, portal).
--
-- Afterwards: put this project's URL + anon/publishable key in sb-config.js
-- as BLOG_SB_URL / BLOG_SB_ANON.
-- ============================================================

-- 1) Admins ----------------------------------------------------------------
create table if not exists public.admin_users (
  email      text primary key,
  added_by   text,
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;
revoke all on public.admin_users from anon, authenticated;

-- The e-mail address(es) that may manage the blog. Add more lines as needed.
insert into public.admin_users (email, added_by) values
  ('chandan.advantech@gmail.com', 'setup')
on conflict (email) do nothing;

create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.admin_users
                  where email = lower(coalesce(auth.jwt()->>'email', '')));
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- 2) Blog posts -------------------------------------------------------------
create table if not exists public.blog_posts (
  slug             text primary key check (slug ~ '^[a-z0-9-]{3,80}$'),
  id               uuid not null default gen_random_uuid(),
  title            text not null,
  title_en         text,
  description      text not null default '',
  description_en   text,
  body_html        text not null default '',
  blocks           jsonb,
  author           text not null default 'Sum-IT',
  author_name      text,
  category         text,
  cover_image      text,
  cover_alt        text not null default '',
  og_image         text,
  tags             text[] not null default '{}',
  meta_title       text,
  meta_description text,
  canonical_url    text,
  is_featured      boolean not null default false,
  published        boolean not null default false,
  status           text generated always as (case when published then 'published' else 'draft' end) stored,
  published_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Columns added after the first release (for projects set up earlier).
alter table public.blog_posts add column if not exists title_en       text;
alter table public.blog_posts add column if not exists description_en text;

create unique index if not exists blog_posts_id_key on public.blog_posts (id);
create index if not exists blog_posts_status_idx on public.blog_posts (status, updated_at desc);
create index if not exists blog_posts_published_at_idx on public.blog_posts (published_at desc) where published = true;

alter table public.blog_posts drop constraint if exists blog_posts_category_chk;
alter table public.blog_posts add constraint blog_posts_category_chk
  check (category is null or category in ('belasting','projecten','samenwerken','basis','sum-it'));
alter table public.blog_posts drop constraint if exists blog_posts_blocks_chk;
alter table public.blog_posts add constraint blog_posts_blocks_chk
  check (blocks is null or (jsonb_typeof(blocks) = 'object' and jsonb_typeof(blocks->'blocks') = 'array'));
alter table public.blog_posts drop constraint if exists blog_posts_canonical_chk;
alter table public.blog_posts add constraint blog_posts_canonical_chk
  check (canonical_url is null or canonical_url ~ '^https://[^\s]+$');

-- updated_at on every change; published_at on first publish (unpublish keeps it)
create or replace function public.touch_blog_posts()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_touch_blog_posts on public.blog_posts;
create trigger trg_touch_blog_posts
  before update on public.blog_posts
  for each row execute function public.touch_blog_posts();

create or replace function public.blog_posts_set_published_at()
returns trigger language plpgsql as $$
begin
  if new.published and new.published_at is null then new.published_at = now(); end if;
  return new;
end $$;
drop trigger if exists trg_blog_posts_published_at on public.blog_posts;
create trigger trg_blog_posts_published_at
  before insert or update on public.blog_posts
  for each row execute function public.blog_posts_set_published_at();

-- 3) Row Level Security -------------------------------------------------------
-- Visitors: read published posts only. Admins: everything.
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

-- Visitors never see "author" (the editor's e-mail); the site requests explicit columns.
revoke all on public.blog_posts from anon;
grant select (id, slug, title, description, body_html, published, status, created_at,
              updated_at, blocks, category, cover_image, cover_alt, tags, author_name,
              published_at, meta_title, meta_description, og_image, canonical_url,
              is_featured, title_en, description_en)
  on public.blog_posts to anon;
grant select, insert, update, delete on public.blog_posts to authenticated;

-- 4) Image uploads: public-read bucket, only admins can write -----------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('blog-images', 'blog-images', true, 5242880,
        array['image/jpeg','image/png','image/webp','image/gif','image/avif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "blog images public read" on storage.objects;
create policy "blog images public read"
  on storage.objects for select
  using (bucket_id = 'blog-images');

drop policy if exists "blog images admin insert" on storage.objects;
create policy "blog images admin insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'blog-images' and public.is_admin());

drop policy if exists "blog images admin update" on storage.objects;
create policy "blog images admin update"
  on storage.objects for update to authenticated
  using (bucket_id = 'blog-images' and public.is_admin());

drop policy if exists "blog images admin delete" on storage.objects;
create policy "blog images admin delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'blog-images' and public.is_admin());
