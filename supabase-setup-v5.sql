-- ============================================================
-- Sum-IT backend v5 — block-based blog articles + image uploads
-- Run ONCE in: Supabase Dashboard -> SQL Editor (after v1–v4).
-- Additive and idempotent: no columns are renamed or dropped, existing
-- posts keep working (body_html stays the fallback content).
-- ============================================================

-- 1) Article metadata + structured content ---------------------------
alter table public.blog_posts add column if not exists blocks           jsonb;          -- {"version":1,"blocks":[...]}
alter table public.blog_posts add column if not exists category         text;           -- landing section id, e.g. 'belasting'
alter table public.blog_posts add column if not exists cover_image      text;           -- public image URL
alter table public.blog_posts add column if not exists cover_alt        text not null default '';
alter table public.blog_posts add column if not exists tags             text[] not null default '{}';
alter table public.blog_posts add column if not exists author_name      text;           -- public display name ("author" holds the editor's e-mail)
alter table public.blog_posts add column if not exists published_at     timestamptz;    -- set on first publish
alter table public.blog_posts add column if not exists meta_title       text;
alter table public.blog_posts add column if not exists meta_description text;
alter table public.blog_posts add column if not exists og_image         text;

alter table public.blog_posts drop constraint if exists blog_posts_category_chk;
alter table public.blog_posts add constraint blog_posts_category_chk
  check (category is null or category in ('belasting','projecten','samenwerken','basis','sum-it'));

alter table public.blog_posts drop constraint if exists blog_posts_blocks_chk;
alter table public.blog_posts add constraint blog_posts_blocks_chk
  check (blocks is null or (jsonb_typeof(blocks) = 'object' and jsonb_typeof(blocks->'blocks') = 'array'));

create index if not exists blog_posts_published_at_idx
  on public.blog_posts (published_at desc) where published = true;

-- 2) Image uploads: public-read bucket, only admins can write ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('blog-images', 'blog-images', true, 5242880,
        array['image/jpeg','image/png','image/webp','image/gif','image/avif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "blog images public read"  on storage.objects;
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

-- 3) OPTIONAL privacy hardening (review before enabling) ---------------
-- The public read policy exposes every column, including "author", which
-- beheer.html fills with the editor's e-mail address. The site itself never
-- reads "author". To hide it from anonymous visitors, uncomment:
--
-- revoke select on public.blog_posts from anon;
-- grant select (slug, title, description, body_html, published, created_at,
--               updated_at, blocks, category, cover_image, cover_alt, tags,
--               author_name, published_at, meta_title, meta_description, og_image)
--   on public.blog_posts to anon;
--
-- (After this, anonymous "select=*" requests fail; the site only uses
--  explicit column lists.)
