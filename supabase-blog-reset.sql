-- ============================================================
-- Sum-IT BLOG project — reset the blog table to the expected shape.
--
-- Use this ONLY on the separate blog project when its blog_posts table
-- was created with different columns (the site then shows "column ...
-- does not exist" errors). It DELETES the blog_posts table and every post
-- in it. Uploaded images in storage and user accounts are kept.
--
-- Steps: SQL Editor -> run this file -> then run supabase-blog-setup.sql.
-- ============================================================

drop table if exists public.blog_posts cascade;
drop function if exists public.touch_blog_posts() cascade;
drop function if exists public.blog_posts_set_published_at() cascade;
