-- Provides helper to scan for tenant-scope anomalies used by monitoring scripts.
set check_function_bodies = off;

create or replace function public.scan_tenant_anomalies()
returns table (
  issue_type text,
  severity text,
  affected_count integer,
  sample jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_sample jsonb;
begin
  -- Audit scope mismatches: rows where business scope disagrees with audit infrastructure scope.
  select count(*)
    into v_count
  from public.system_audit_log sal
  join public.businesses b on sal.business_id = b.id
  where sal.infrastructure_id <> b.infrastructure_id;

  if v_count > 0 then
    select jsonb_agg(row_to_json(t))
      into v_sample
    from (
      select sal.id, sal.business_id, sal.infrastructure_id as audit_infrastructure_id,
             b.infrastructure_id as business_infrastructure_id,
             sal.event_type, sal.created_at
      from public.system_audit_log sal
      join public.businesses b on sal.business_id = b.id
      where sal.infrastructure_id <> b.infrastructure_id
      order by sal.created_at desc
      limit 5
    ) as t;

    return query
      select 'AUDIT_SCOPE_MISMATCH', 'critical', v_count, coalesce(v_sample, '[]'::jsonb);
  end if;

  -- Permission cache drift: cached version differs from active context.
  select count(*)
    into v_count
  from public.user_permissions_cache upc
  join public.user_active_contexts uac
    on upc.user_id = uac.user_id
   and upc.infrastructure_id = uac.infrastructure_id
   and (upc.business_id is not distinct from uac.business_id)
  where upc.cache_version <> uac.context_version;

  if v_count > 0 then
    select jsonb_agg(row_to_json(t))
      into v_sample
    from (
      select upc.user_id, upc.infrastructure_id, upc.business_id,
             upc.cache_version, uac.context_version,
             upc.cached_at
      from public.user_permissions_cache upc
      join public.user_active_contexts uac
        on upc.user_id = uac.user_id
       and upc.infrastructure_id = uac.infrastructure_id
       and (upc.business_id is not distinct from uac.business_id)
      where upc.cache_version <> uac.context_version
      order by upc.cached_at desc
      limit 5
    ) as t;

    return query
      select 'PERMISSION_CACHE_DRIFT', 'warning', v_count, coalesce(v_sample, '[]'::jsonb);
  end if;

  -- Unauthorized access attempts flagged in the last 24 hours.
  select count(*)
    into v_count
  from public.permission_check_failures pcf
  where pcf.is_potential_threat
    and pcf.created_at > now() - interval '24 hours';

  if v_count > 0 then
    select jsonb_agg(row_to_json(t))
      into v_sample
    from (
      select pcf.user_id, pcf.business_id, pcf.infrastructure_id, pcf.permission_key,
             pcf.failure_reason, pcf.created_at
      from public.permission_check_failures pcf
      where pcf.is_potential_threat
        and pcf.created_at > now() - interval '24 hours'
      order by pcf.created_at desc
      limit 5
    ) as t;

    return query
      select 'UNAUTHORIZED_ACCESS_ALERTS', 'critical', v_count, coalesce(v_sample, '[]'::jsonb);
  end if;

  -- No anomalies detected
  return;
end;
$$;

grant execute on function public.scan_tenant_anomalies() to service_role;
