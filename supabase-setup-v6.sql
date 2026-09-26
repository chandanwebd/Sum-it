-- ============================================================
-- Sum-IT backend v6 — blog CMS: status, stable id, SEO, privacy
-- Run ONCE in: Supabase Dashboard -> SQL Editor, AFTER supabase-setup-v5.sql.
-- Additive and idempotent: nothing is renamed or dropped. Safe to re-run.
--
-- How the CMS fields map onto public.blog_posts:
--   id                -> id (new, uuid)          slug          -> slug (primary key)
--   title             -> title                   short_desc.   -> description
--   featured_image    -> cover_image (v5)        image_alt     -> cover_alt (v5)
--   keywords          -> tags (v5)               content       -> blocks (v5) + body_html
--   meta_title        -> meta_title (v5)         meta_descr.   -> meta_description (v5)
--   status            -> status (new, derived from "published")
--   published_at      -> published_at (v5)       canonical_url -> canonical_url (new)
--   is_featured       -> is_featured (new)       created_at / updated_at (v3)
-- ============================================================

do $$
begin
  if not exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'blog_posts' and column_name = 'blocks') then
    raise exception 'Run supabase-setup-v5.sql first (blog_posts.blocks is missing).';
  end if;
end $$;

-- 1) New columns --------------------------------------------------------
alter table public.blog_posts add column if not exists id            uuid not null default gen_random_uuid();
alter table public.blog_posts add column if not exists canonical_url text;
alter table public.blog_posts add column if not exists is_featured   boolean not null default false;

-- "status" is derived from the existing "published" switch, so the two can
-- never disagree and existing code that writes "published" keeps working.
alter table public.blog_posts add column if not exists status text
  generated always as (case when published then 'published' else 'draft' end) stored;

create unique index if not exists blog_posts_id_key on public.blog_posts (id);
create index if not exists blog_posts_status_idx on public.blog_posts (status, updated_at desc);

alter table public.blog_posts drop constraint if exists blog_posts_canonical_chk;
alter table public.blog_posts add constraint blog_posts_canonical_chk
  check (canonical_url is null or canonical_url ~ '^https://[^\s]+$');

-- 2) published_at: set on first publish -----------------------------------
-- Publishing sets published_at to now() unless the editor chose a date.
-- Unpublishing keeps the article and its original publish date.
create or replace function public.blog_posts_set_published_at()
returns trigger language plpgsql as $$
begin
  if new.published and new.published_at is null then
    new.published_at = now();
  end if;
  return new;
end $$;

drop trigger if exists trg_blog_posts_published_at on public.blog_posts;
create trigger trg_blog_posts_published_at
  before insert or update on public.blog_posts
  for each row execute function public.blog_posts_set_published_at();

-- 3) RLS review (policies from v3 stay as they are) ------------------------
--   "public reads published posts": select using (published = true)   -> drafts never public
--   "admins manage posts":          all to authenticated using/with check (is_admin())
alter table public.blog_posts enable row level security;

-- 4) Privacy: hide the editor's e-mail ("author") from anonymous visitors.
-- The public site only requests explicit column lists, never select=*.
revoke select on public.blog_posts from anon;
grant select (id, slug, title, description, body_html, published, status, created_at,
              updated_at, blocks, category, cover_image, cover_alt, tags, author_name,
              published_at, meta_title, meta_description, og_image, canonical_url,
              is_featured)
  on public.blog_posts to anon;

-- Signed-in admins keep full access through the "admins manage posts" policy.
grant select, insert, update, delete on public.blog_posts to authenticated;

-- 5) Storage: bucket + policies were created in v5 ("blog-images",
--    public read, admin-only insert/update/delete, 5 MB, images only).
--    Nothing to change here; re-run v5 if the bucket is missing.
