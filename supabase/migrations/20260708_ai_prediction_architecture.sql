-- Grainology AI prediction architecture.
-- Apply manually in Supabase after review. This migration is idempotent and
-- does not delete any existing prediction or actual-history data.

create extension if not exists pgcrypto;

create table if not exists public.agmarknet_ai_actuals (
  date date not null,
  state_name text not null,
  state_id text,
  state_key text not null,
  grain text not null check (grain in ('Wheat','Paddy','Maize','Mustard')),
  price numeric not null check (price > 0),
  price_low numeric,
  price_high numeric,
  arrival numeric,
  market_count integer not null default 0,
  aggregation_method text not null default 'median',
  source_cache_key text,
  source_fetched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (date, state_name, grain)
);

create index if not exists agmarknet_ai_actuals_date_idx
  on public.agmarknet_ai_actuals (date desc);

create index if not exists agmarknet_ai_actuals_grain_state_date_idx
  on public.agmarknet_ai_actuals (grain, state_name, date desc);

create index if not exists agmarknet_ai_actuals_updated_at_idx
  on public.agmarknet_ai_actuals (updated_at desc);

create table if not exists public.ai_prediction_runs (
  run_id uuid primary key default gen_random_uuid(),
  status text not null default 'queued'
    check (status in ('queued','running','skipped','failed','validated','published')),
  trigger_source text not null default 'schedule'
    check (trigger_source in ('schedule','manual','code_change')),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  published_at timestamptz,
  actuals_max_date date,
  actuals_max_updated_at timestamptz,
  actuals_row_count bigint,
  code_version text,
  kaggle_kernel text,
  kaggle_run_reference text,
  artifact_prefix text,
  error_message text,
  manifest jsonb
);

create table if not exists public.ai_prediction_releases (
  release_id uuid primary key default gen_random_uuid(),
  run_id uuid references public.ai_prediction_runs(run_id),
  schema_version text not null,
  artifact_prefix text not null,
  canonical_prefix text,
  data_latest_date date not null,
  generated_at timestamptz not null,
  created_at timestamptz not null default now(),
  is_active boolean not null default false,
  manifest jsonb not null
);

create unique index if not exists ai_prediction_releases_one_active_idx
  on public.ai_prediction_releases (is_active)
  where is_active = true;

create or replace function public.activate_ai_prediction_release(p_release_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run_id uuid;
begin
  select release.run_id
    into v_run_id
  from public.ai_prediction_releases release
  join public.ai_prediction_runs run on run.run_id = release.run_id
  where release.release_id = p_release_id
    and run.status = 'validated';

  if v_run_id is null then
    raise exception 'Release % does not exist or its run is not validated', p_release_id;
  end if;

  update public.ai_prediction_releases set is_active = false where is_active = true;
  update public.ai_prediction_releases set is_active = true where release_id = p_release_id;
  update public.ai_prediction_runs
    set status = 'published', published_at = now()
    where run_id = v_run_id;
end;
$$;

alter table public.agmarknet_ai_actuals enable row level security;
alter table public.ai_prediction_runs enable row level security;
alter table public.ai_prediction_releases enable row level security;

drop policy if exists "Service role reads and writes ai actuals" on public.agmarknet_ai_actuals;
create policy "Service role reads and writes ai actuals"
on public.agmarknet_ai_actuals
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "Service role reads and writes ai runs" on public.ai_prediction_runs;
create policy "Service role reads and writes ai runs"
on public.ai_prediction_runs
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "Service role reads and writes ai releases" on public.ai_prediction_releases;
create policy "Service role reads and writes ai releases"
on public.ai_prediction_releases
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

-- Create the private bucket manually if your Supabase project does not allow
-- bucket creation from migrations:
--   bucket id/name: ai-predictions
--   public: false
insert into storage.buckets (id, name, public)
values ('ai-predictions', 'ai-predictions', false)
on conflict (id) do update set public = false;
