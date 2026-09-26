/* Sum-IT backend config — Supabase.
   Fill these in with YOUR Supabase project values.
   The anon key is safe to expose publicly (it only allows what your
   Row Level Security policies allow: read content, and write only when
   logged in). Do NOT put the "service_role" key here. */
window.SB_URL  = 'https://kncruytvvqyrwxhgostc.supabase.co';        // e.g. https://abcdxyz.supabase.co
window.SB_ANON = 'sb_publishable_Okc2mW8gDttU9a6mjv56Fw_4k_mM7hN';   // the "anon / public" key

/* Blog CMS database (optional). Leave empty to use the project above.
   Fill in to run the blog (/blog/, /admin/blogs/) on its own Supabase project,
   set up with supabase-blog-setup.sql. Sign-ups, portal and beheer.html keep
   using the project above. Again: only the anon/publishable key, never service_role. */
window.BLOG_SB_URL  = 'https://fqdgvkpfsixeigplcrpu.supabase.co';   // e.g. https://abcdxyz.supabase.co
window.BLOG_SB_ANON = 'sb_publishable_vWEtpw5OyG-TIlC8KElVmg_K_vCN5a7';   // that project's anon / publishable key

/* Password-only admin screen: the admin account's e-mail. When filled in,
   /admin/blogs/ asks only for the password (checked by Supabase, set under
   Authentication -> Users). Leave empty to ask for e-mail + password. */
window.BLOG_ADMIN_EMAIL = 'chandan.advantech@gmail.com';
