create extension if not exists pgcrypto;

create table if not exists public.competitor_scan_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'scheduled',
  status text not null default 'running' check (status in ('running','completed','partial','failed')),
  competitors_scanned integer not null default 0,
  observations_found integer not null default 0,
  gaps_found integer not null default 0,
  error text,
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.competitor_observations (
  id uuid primary key default gen_random_uuid(),
  competitor text not null,
  url text not null,
  content_type text not null default 'other' check (content_type in ('prediction','seo','other')),
  title text,
  fixture_id text,
  home_team text,
  away_team text,
  topic text,
  country text,
  language text,
  source text not null default 'public-web',
  published_at timestamptz,
  first_detected_at timestamptz not null default now(),
  last_detected_at timestamptz not null default now(),
  raw_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (competitor, url)
);

create table if not exists public.competitor_gaps (
  id uuid primary key default gen_random_uuid(),
  observation_id uuid references public.competitor_observations(id) on delete cascade,
  competitor text not null,
  gap_type text not null check (gap_type in ('prediction_missing','seo_missing','country_opportunity','language_opportunity','topic_opportunity')),
  fixture_id text,
  topic text,
  country text,
  language text,
  zerra_prediction_exists boolean not null default false,
  zerra_seo_exists boolean not null default false,
  priority integer not null default 50 check (priority between 0 and 100),
  status text not null default 'open' check (status in ('open','covered','ignored')),
  reason text,
  detected_at timestamptz not null default now(),
  resolved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists competitor_observations_detected_idx on public.competitor_observations(last_detected_at desc);
create index if not exists competitor_observations_fixture_idx on public.competitor_observations(fixture_id);
create index if not exists competitor_observations_competitor_idx on public.competitor_observations(competitor, last_detected_at desc);
create index if not exists competitor_gaps_status_priority_idx on public.competitor_gaps(status, priority desc, detected_at desc);
create index if not exists competitor_gaps_fixture_idx on public.competitor_gaps(fixture_id);
create index if not exists competitor_scan_runs_started_idx on public.competitor_scan_runs(started_at desc);

alter table public.competitor_scan_runs enable row level security;
alter table public.competitor_observations enable row level security;
alter table public.competitor_gaps enable row level security;

revoke all on public.competitor_scan_runs from public, anon, authenticated;
revoke all on public.competitor_observations from public, anon, authenticated;
revoke all on public.competitor_gaps from public, anon, authenticated;

grant all on public.competitor_scan_runs to service_role;
grant all on public.competitor_observations to service_role;
grant all on public.competitor_gaps to service_role;