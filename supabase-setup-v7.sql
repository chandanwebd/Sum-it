-- Sum-IT v7: separate, optional mailing consent on signups.
-- Run once in the Supabase SQL Editor (after v2). Additive and safe to re-run.
--
-- mailing_optin records whether someone ticked the optional "send me updates"
-- box. It is separate from the signup itself (account e-mails such as the
-- welcome / set-password mail are not mailings). Existing rows get NULL:
-- consent was never asked for them separately, so treat NULL as "no consent".
-- /api/signup writes the column once it exists; before that it stores the
-- signup without it.

alter table public.signups
  add column if not exists mailing_optin boolean;

comment on column public.signups.mailing_optin is
  'Optional mailing consent from the signup form (true = opted in). NULL = not asked (signed up before v7).';
