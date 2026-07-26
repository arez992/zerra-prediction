create or replace function public.claim_ai_ceo_autopilot_lease(
  p_owner text,
  p_lease_seconds integer default 600
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed boolean;
begin
  update public.ai_ceo_autopilot_config
  set
    run_lock_owner = p_owner,
    run_lock_expires_at = now() + make_interval(secs => greatest(60, least(p_lease_seconds, 3600))),
    updated_at = now()
  where id = 'main'
    and status = 'running'
    and kill_switch = false
    and (
      run_lock_expires_at is null
      or run_lock_expires_at <= now()
      or run_lock_owner = p_owner
    )
  returning true into claimed;

  return coalesce(claimed, false);
end;
$$;

create or replace function public.release_ai_ceo_autopilot_lease(
  p_owner text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  released boolean;
begin
  update public.ai_ceo_autopilot_config
  set
    run_lock_owner = null,
    run_lock_expires_at = null,
    updated_at = now()
  where id = 'main'
    and run_lock_owner = p_owner
  returning true into released;

  return coalesce(released, false);
end;
$$;

revoke all on function public.claim_ai_ceo_autopilot_lease(text, integer) from public, anon, authenticated;
revoke all on function public.release_ai_ceo_autopilot_lease(text) from public, anon, authenticated;
grant execute on function public.claim_ai_ceo_autopilot_lease(text, integer) to service_role;
grant execute on function public.release_ai_ceo_autopilot_lease(text) to service_role;