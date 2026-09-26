-- ============================================================
-- Sum-IT BLOG project — English card text for CMS posts.
-- Run ONCE in the blog project's SQL Editor (after supabase-blog-setup.sql).
-- Additive and idempotent: existing posts are kept.
--
-- Adds an optional English title + short description. On /blog/ the card
-- shows these when a visitor picks EN; without them the Dutch text is shown.
-- ============================================================

alter table public.blog_posts add column if not exists title_en       text;
alter table public.blog_posts add column if not exists description_en text;

-- Visitors may read the new columns (the rest of the column list is unchanged).
grant select (title_en, description_en) on public.blog_posts to anon;
