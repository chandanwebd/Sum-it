# Sum-IT Founding 500 — Setup (branch `founding-500`)

Everything on this branch is ready. Follow these steps top-to-bottom (~1 hour of clicking).
Nothing here requires writing code. Where a value is created, paste it in the place named in **bold**.

## 0. What's on this branch
- `index.html` — new site (v22), wired for `/api/*`, live counters, CMS-overrides, portal links
- `portal.html` — member portal (login/register, queue position, referral link + QR, city)
- `admin.html` — existing content editor (unchanged, works on the new site too)
- `functions/api/*` — Cloudflare Pages Functions: `signup`, `stats/public`, `laposta-webhook`
- `supabase-setup.sql` (existing, CMS) + `supabase-setup-v2.sql` (new: waitlist/portal/stats)
- `config.js` — socials + fallback counter (edit here, no code knowledge needed)
- `sb-config.js` — **paste Supabase URL + anon key here** (step 1)

## 1. Supabase (database + logins) — free
1. supabase.com → New project → region **eu-central-1 (Frankfurt)** → strong DB password.
2. SQL Editor → run `supabase-setup.sql` → then run `supabase-setup-v2.sql`.
3. Authentication → Providers → Email: ON, "Confirm email" ON.
   Authentication → Policies/Settings → min password length **12**.
4. Project Settings → API: copy **Project URL** and **anon public key** → paste into `sb-config.js`.
   Copy **service_role key** → used in step 3 as `SUPABASE_SERVICE_KEY` (NEVER in any file).
5. Authentication → Users → Add user (Ian, Payam, Abhishek e-mails, auto-confirm) → these accounts log in to `admin.html` (texts) — and any member can register on `portal.html`.

## 2. Laposta (double opt-in list) — free < 2.000 contacts
1. Create list **"Sum-IT Founding 500"**, double opt-in ON, sender domain sum-it.eu verified (SPF/DKIM DNS records shown by Laposta).
2. List → custom fields (all text): `naam, rol, taal, bedrijfstype, boekhouder, ref_code, referred_by, ref_link, queue_pos`.
3. Get **API key** (account settings) and the **list id**.
4. Webhooks (list settings): URL `https://sum-it.eu/api/laposta-webhook?secret=WEBHOOK_SECRET_FROM_STEP_3` for events *subscribed* and *unsubscribed*.

## 3. Cloudflare Pages (hosting + API) — free, commercial allowed
1. dash.cloudflare.com → Workers & Pages → Create → Pages → **Connect to Git** → select `abhi020483/sum-it-website`, production branch **founding-500** (switch to `main` after merge). Build settings: none/static, output dir `/`.
2. Project → Settings → Environment variables (Production):
   - `SUPABASE_URL` — from step 1.4
   - `SUPABASE_SERVICE_KEY` — from step 1.4 (secret!)
   - `IP_SALT` — any random string
   - `WEBHOOK_SECRET` — any random string (same as in the Laposta webhook URL)
   - `LAPOSTA_API_KEY`, `LAPOSTA_LIST_ID` — from step 2.3
   - `BREVO_API_KEY` — step 4 (may be empty at first; welcome mail is skipped, all else works)
   - `MAIL_FROM` — e.g. `Sum-IT <hallo@sum-it.eu>`
   - `DISPLAY_OFFSET` — `143`
3. Deploy. Test on the `*.pages.dev` preview URL: signup → Laposta confirm mail → click → webhook → portal shows position.
4. DNS switch (the conscious moment): domain sum-it.eu → Cloudflare Pages custom domain, remove GitHub Pages. Old site stays in git history; rollback = point DNS back.

## 4. Brevo (welcome + portal verification mails) — free 300/day
1. brevo.com account → verify sender domain sum-it.eu (SPF/DKIM) → SMTP & API → new **API key** → Cloudflare env `BREVO_API_KEY`.
2. The welcome-mail text lives in `functions/api/laposta-webhook.js` (NL + EN, easy to edit) — the bookkeeper-programme mail can be built later as a Brevo template by Payam, no code.
3. Supabase Auth verification mails: Supabase → Authentication → Email Templates (customize wording; sender can also be routed via Brevo SMTP in Auth settings).

## 5. After go-live checklist
- [ ] End-to-end test with a real e-mail + a second e-mail via the ?ref= link (counter +1 in portal)
- [ ] `config.js`: fill social URLs when the accounts exist (icons appear automatically)
- [ ] Cloudflare → Web Analytics: enable for sum-it.eu (free, cookieless)
- [ ] `/privacy` page live before promoting (processors: Supabase, Laposta, Brevo, Cloudflare; contact privacy@sum-it.eu)
- [ ] Remove DEMO labels that now have live data (map stays DEMO until cities reach ≥3s)
- [ ] Enable pg_cron purge (bottom of `supabase-setup-v2.sql`)

## Notes
- The +143 counter offset lives in `DISPLAY_OFFSET` (one env var; set to 0 to show the real count).
- Everything degrades gracefully: without Laposta key the signup still lands in Supabase; without Brevo the welcome mail is skipped; without Supabase the site falls back to demo data.
