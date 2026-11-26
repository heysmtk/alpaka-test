-- Alpaka Test: schéma databáze. Spusť celé v Supabase → SQL Editor → New query → Run.
-- Skript jde pustit opakovaně (nic nemaže, jen sjednotí stav).
--
-- Co a proč:
--  * tests: výsledky testů (bez tělesné váhy). Čte a zapisuje je jen týmový účet.
--  * ping:  jeden řádek, který smí číst kdokoli (keepalive workflow a žlutá lišta).
--  * RLS je zapnuté na obou tabulkách.
--  * Ve vašem projektu je vypnuté automatické udělování API přístupu, proto jsou
--    GRANTy napsané explicitně. Role anon (nepřihlášený) nedostane na tests nic.
--  * Smazání je "měkké" (deleted_at); fyzické DELETE není nikomu povolené.
--
-- UID týmového účtu (Authentication → Users). Veřejně to není tajné, nic neodemyká.

-- ---------- tests ----------

create table if not exists public.tests (
  id         text        primary key check (id ~ '^[A-Za-z0-9_-]{1,64}$'),
  created_at timestamptz not null,
  nick       text        not null check (char_length(nick) between 1 and 30),
  results    jsonb       not null check (jsonb_typeof(results) = 'object'),
  deleted_at timestamptz,
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tests_set_updated_at on public.tests;
create trigger tests_set_updated_at
  before update on public.tests
  for each row execute function public.set_updated_at();

alter table public.tests enable row level security;

drop policy if exists tests_team_select on public.tests;
drop policy if exists tests_team_insert on public.tests;
drop policy if exists tests_team_update on public.tests;

create policy tests_team_select on public.tests
  for select to authenticated
  using ((select auth.uid()) = '6819f017-9089-4cfb-ab24-c461347381f3'::uuid);

create policy tests_team_insert on public.tests
  for insert to authenticated
  with check ((select auth.uid()) = '6819f017-9089-4cfb-ab24-c461347381f3'::uuid);

create policy tests_team_update on public.tests
  for update to authenticated
  using ((select auth.uid()) = '6819f017-9089-4cfb-ab24-c461347381f3'::uuid)
  with check ((select auth.uid()) = '6819f017-9089-4cfb-ab24-c461347381f3'::uuid);

-- Žádná policy pro DELETE: mazat řádky fyzicky nejde.

-- ---------- ping ----------

create table if not exists public.ping (
  id int primary key check (id = 1),
  ok boolean not null default true
);

insert into public.ping (id, ok) values (1, true)
on conflict (id) do nothing;

alter table public.ping enable row level security;

drop policy if exists ping_read on public.ping;
create policy ping_read on public.ping
  for select to anon, authenticated
  using (true);

-- ---------- GRANTy (explicitní) ----------

grant usage on schema public to anon, authenticated;

revoke all on public.tests from anon, authenticated;
revoke all on public.ping  from anon, authenticated;

grant select, insert, update on public.tests to authenticated;
grant select on public.ping to anon, authenticated;
