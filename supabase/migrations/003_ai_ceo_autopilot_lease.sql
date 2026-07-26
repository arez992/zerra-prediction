alter table public.ai_ceo_autopilot_config
  add column if not exists run_lock_owner text,
  add column if not exists run_lock_expires_at timestamptz;