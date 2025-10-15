-- Introduces the audit_log() helper and routes triggers through it.
set check_function_bodies = off;

create or replace function public.audit_log(payload jsonb)
returns public.system_audit_log
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payload jsonb := coalesce(payload, '{}'::jsonb);
  v_event_type text := trim(both from coalesce(v_payload ->> 'event_type', ''));
  v_action text := trim(both from coalesce(v_payload ->> 'action', 'performed'));
  v_target_entity_type text := nullif(trim(both from coalesce(v_payload ->> 'target_entity_type', '')) , '');
  v_target_entity_id uuid := nullif(v_payload ->> 'target_entity_id', '')::uuid;
  v_business_id uuid := nullif(v_payload ->> 'business_id', '')::uuid;
  v_infrastructure_id uuid := nullif(v_payload ->> 'infrastructure_id', '')::uuid;
  v_actor_id uuid := coalesce(nullif(v_payload ->> 'actor_id', '')::uuid, auth.uid());
  v_actor_role text := nullif(v_payload ->> 'actor_role', '');
  v_change_summary text := nullif(v_payload ->> 'change_summary', '');
  v_severity text := lower(coalesce(nullif(v_payload ->> 'severity', ''), 'info'));
  v_ip inet := nullif(v_payload ->> 'ip_address', '')::inet;
  v_user_agent text := nullif(v_payload ->> 'user_agent', '');
  v_session_id text := nullif(v_payload ->> 'session_id', '');
  v_request_id text := nullif(v_payload ->> 'request_id', '');
  v_metadata jsonb := coalesce(v_payload -> 'metadata', '{}'::jsonb);
  v_previous_state jsonb := v_payload -> 'previous_state';
  v_new_state jsonb := v_payload -> 'new_state';
  v_result public.system_audit_log;
  v_default_infrastructure uuid;
begin
  if v_event_type is null or v_event_type = '' then
    raise exception 'audit_log payload must include event_type';
  end if;

  if v_target_entity_type is null then
    v_target_entity_type := 'system';
  end if;

  if v_actor_role is null then
    v_actor_role := coalesce(public.current_infrastructure_role(), public.current_business_role());
  end if;

  if v_business_id is null and public.current_business_id() is not null then
    v_business_id := public.current_business_id();
  end if;

  if v_infrastructure_id is null then
    if v_business_id is not null then
      select infrastructure_id
        into v_infrastructure_id
        from public.businesses
       where id = v_business_id;
    end if;
  end if;

  if v_infrastructure_id is null then
    v_infrastructure_id := public.current_infrastructure_id();
  end if;

  if v_infrastructure_id is null then
    select id
      into v_default_infrastructure
      from public.infrastructures
      order by created_at
      limit 1;
    v_infrastructure_id := v_default_infrastructure;
  end if;

  insert into public.system_audit_log (
    event_type,
    actor_id,
    actor_role,
    target_entity_type,
    target_entity_id,
    business_id,
    infrastructure_id,
    action,
    change_summary,
    severity,
    metadata,
    previous_state,
    new_state,
    ip_address,
    user_agent,
    session_id,
    request_id
  ) values (
    v_event_type,
    v_actor_id,
    v_actor_role,
    v_target_entity_type,
    v_target_entity_id,
    v_business_id,
    v_infrastructure_id,
    v_action,
    v_change_summary,
    v_severity,
    v_metadata,
    v_previous_state,
    v_new_state,
    v_ip,
    v_user_agent,
    v_session_id,
    v_request_id
  )
  returning * into v_result;

  return v_result;
end;
$$;

grant execute on function public.audit_log(jsonb) to authenticated, anon, service_role;

comment on function public.audit_log(jsonb) is 'Central helper that writes to system_audit_log with automatic infrastructure scoping.';

create or replace function public.audit_trigger_func()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_type text;
  v_action text;
  v_payload jsonb;
begin
  if tg_op = 'INSERT' then
    v_event_type := tg_table_name || '_created';
    v_action := 'created';
  elsif tg_op = 'UPDATE' then
    v_event_type := tg_table_name || '_updated';
    v_action := 'updated';
  elsif tg_op = 'DELETE' then
    v_event_type := tg_table_name || '_deleted';
    v_action := 'deleted';
  else
    v_event_type := tg_table_name || '_' || lower(tg_op);
    v_action := lower(tg_op);
  end if;

  v_payload := jsonb_build_object(
    'event_type', v_event_type,
    'action', v_action,
    'target_entity_type', tg_table_name,
    'target_entity_id', case
      when tg_op in ('INSERT', 'UPDATE') then (to_jsonb(new) ->> 'id')::uuid
      else (to_jsonb(old) ->> 'id')::uuid
    end,
    'business_id', case
      when tg_op in ('INSERT', 'UPDATE') then (to_jsonb(new) ->> 'business_id')::uuid
      else (to_jsonb(old) ->> 'business_id')::uuid
    end,
    'previous_state', case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    'new_state', case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );

  perform public.audit_log(v_payload);

  return coalesce(new, old);
end;
$$;

do $$
begin
  revoke all on function public.audit_trigger_func() from public;
  grant execute on function public.audit_trigger_func() to authenticated, service_role;
exception when undefined_function then
  null;
end $$;
