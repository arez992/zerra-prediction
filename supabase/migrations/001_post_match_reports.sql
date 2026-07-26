create extension if not exists pgcrypto;

create table if not exists public.seo_match_reports (
  id uuid primary key default gen_random_uuid(),
  fixture_id bigint not null,
  locale text not null default 'en',
  slug text not null,
  source_fingerprint text not null,
  fixture_status text not null,
  home_score integer,
  away_score integer,
  headline text not null default '',
  summary text not null default '',
  match_report text not null default '',
  post_match_analysis text not null default '',
  facts jsonb not null default '{}'::jsonb,
  statistics jsonb not null default '[]'::jsonb,
  events jsonb not null default '[]'::jsonb,
  data_quality text not null default 'unknown',
  model text,
  status text not null default 'draft' check (status in ('draft','published','failed')),
  generated_at timestamptz,
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (fixture_id, locale)
 );

create index if not exists seo_match_reports_slug_idx on public.seo_match_reports (slug, locale);
create index if not exists seo_match_reports_status_idx on public.seo_match_reports (status, updated_at desc);
create index if not exists seo_match_reports_fingerprint_idx on public.seo_match_reports (source_fingerprint);

alter table public.seo_match_reports enable row level security;

revoke all on table public.seo_match_reports from anon, authenticated;