-- Heir: the memory model's corrections, fitted from real answers (see src/heir/calibrate.ts). A fit is two numbers (a, b)
-- that correct the model's chance of recall. One is fitted on everyone's answers (scope 'population': it decides what is "in
-- memory", so the board stays fair); one on a person's own answers once they have enough (scope 'member': it only sharpens
-- what to review next). Written only by the daily job (the service key); anyone signed in reads the population's, and a
-- person reads their own. Safe to run more than once.
create table if not exists public.heir_model_params (
  id            uuid primary key default gen_random_uuid(),
  scope         text not null check (scope in ('population', 'member')),
  member_id     uuid references public.heir_members (id) on delete cascade,
  model_version text not null check (length(model_version) <= 40),
  a             real not null check (a between 0.3 and 3),
  b             real not null check (b between -2 and 2),
  n             integer not null check (n > 0),
  loss_before   real not null,
  loss_after    real not null,
  fitted_at     timestamptz not null default now(),
  check ((scope = 'population') = (member_id is null))
);
create index if not exists heir_model_params_latest on public.heir_model_params (scope, member_id, fitted_at desc);

alter table public.heir_model_params enable row level security;

drop policy if exists heir_model_params_read on public.heir_model_params;
create policy heir_model_params_read on public.heir_model_params for select to authenticated
  using (
    scope = 'population'
    or exists (select 1 from public.heir_members m join public.heir_households h on h.id = m.household_id
               where m.id = heir_model_params.member_id and h.owner_id = (select auth.uid()))
  );

revoke all on public.heir_model_params from anon, authenticated;
grant select on public.heir_model_params to authenticated;
