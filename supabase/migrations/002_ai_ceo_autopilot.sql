create table if not exists public.ai_ceo_autopilot_config (
  id text primary key default 'main',
  status text not null default 'stopped' check (status in ('running','paused','stopped')),
  kill_switch boolean not null default false,
  cycle_minutes integer not null default 30,
  max_cycles_per_day integer not null default 24,
  max_ai_calls_per_day integer not null default 8,
  min_ai_gap_minutes integer not null default 60,
  skip_unchanged boolean not null default true,
  auto_execute_low_risk boolean not null default true,
  last_snapshot_fingerprint text,
  last_cycle_at timestamptz,
  last_ai_call_at timestamptz,
  started_at timestamptz,
  started_by text,
  updated_at timestamptz not null default now()
 );

create table if not exists public.ai_ceo_autopilot_runs (
  id uuid primary key default gen_random_uuid(),
  trigger_source text not null,
  status text not null,
  snapshot_fingerprint text,
  skipped_reason text,
  ai_source text,
  ai_call_used boolean not null default false,
  decision_id text,
  auto_approved boolean not null default false,
  auto_executed boolean not null default false,
  result jsonb not null default '{}'::jsonb,
  error text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
 );

create index if not exists idx_ai_ceo_autopilot_runs_started_at on public.ai_ceo_autopilot_runs(started_at desc);

alter table public.ai_ceo_autopilot_config enable row level security;
alter table public.ai_ceo_autopilot_runs enable row level security;
revoke all on table public.ai_ceo_autopilot_config from anon, authenticated;
revoke all on table public.ai_ceo_autopilot_runs from anon, authenticated;

insert into public.ai_ceo_autopilot_config (id) values ('main') on conflict (id) do nothing;
