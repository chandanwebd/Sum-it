-- Sum-IT — Supabase migration v4 (Breda balie-actie)
-- Run ONCE in the Supabase SQL editor, after v1/v2/v3. Safe to re-run (idempotent).
-- Adds counter-signup fields so /api/signup can store a phone number to call back,
-- plus the campaign city and the specific wholesaler counter (vestiging) for attribution.

alter table public.signups add column if not exists telefoon  text;
alter table public.signups add column if not exists stad      text;   -- campaign city, e.g. 'breda'
alter table public.signups add column if not exists vestiging text;   -- counter, e.g. 'tu-breda'

-- (city already exists from v2 and holds the sign-up's own town / 'plaats'.)

create index if not exists signups_vestiging_idx on public.signups(vestiging);

-- Surface the new fields in the admin export (beheer.html -> admin_signups()).
-- v3 defined this as returns table(...); changing the return type needs a DROP first.
-- Same columns as v3, with telefoon/stad/vestiging appended at the end (safe for the
-- key-based JS in beheer.html).
drop function if exists public.admin_signups();
create function public.admin_signups()
returns table (id bigint, email text, naam text, rol text, bedrijfstype text,
               boekhouder text, taal text, source text, city text, ref_code text,
               referred_by text, status text, queue_pos integer,
               confirmed_at timestamptz, created_at timestamptz,
               telefoon text, stad text, vestiging text)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return query select s.id, s.email, s.naam, s.rol, s.bedrijfstype, s.boekhouder,
                      s.taal, s.source, s.city, s.ref_code, s.referred_by,
                      s.status, s.queue_pos, s.confirmed_at, s.created_at,
                      s.telefoon, s.stad, s.vestiging
                 from public.signups s order by s.created_at desc;
end $$;
grant execute on function public.admin_signups() to authenticated;
revoke all on function public.admin_signups() from public, anon;
