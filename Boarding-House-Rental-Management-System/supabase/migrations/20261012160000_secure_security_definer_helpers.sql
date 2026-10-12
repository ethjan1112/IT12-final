-- Keep SECURITY DEFINER helpers out of the exposed public RPC namespace.
-- RLS policies continue to call these functions by their stored object IDs.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

alter function public.is_property_staff() set schema private;
alter function public.owns_tenant(text) set schema private;
alter function public.owns_lease(text) set schema private;
alter function public.owns_invoice(text) set schema private;

-- These helpers remain executable by authenticated requests only so RLS can
-- evaluate the existing policies. The private schema is not in the Data API.
revoke all on function private.is_property_staff() from public, anon;
revoke all on function private.owns_tenant(text) from public, anon;
revoke all on function private.owns_lease(text) from public, anon;
revoke all on function private.owns_invoice(text) from public, anon;
grant execute on function private.is_property_staff() to authenticated;
grant execute on function private.owns_tenant(text) to authenticated;
grant execute on function private.owns_lease(text) to authenticated;
grant execute on function private.owns_invoice(text) to authenticated;

-- The trigger function's PL/pgSQL body resolves function names at runtime.
-- Update its staff check because is_property_staff now lives in private.
create or replace function public.protect_tenant_row_updates()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select private.is_property_staff()) then
    return new;
  end if;

  if tg_table_name = 'tenant_notifications'
    and (to_jsonb(new) - 'read') is distinct from (to_jsonb(old) - 'read') then
    raise exception 'Tenants may only mark their own notifications as read';
  end if;

  if tg_table_name = 'room_assignment_requests'
    and (to_jsonb(new) - array['requested_room_id', 'status', 'updated_at'])
      is distinct from (to_jsonb(old) - array['requested_room_id', 'status', 'updated_at']) then
    raise exception 'Tenants may only retry their room request';
  end if;

  return new;
end;
$$;
revoke all on function public.protect_tenant_row_updates() from public, anon, authenticated;

-- This maintenance helper is not part of the application API. It is present
-- in the hosted database but is not defined in the checked-in migrations.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end;
$$;

notify pgrst, 'reload schema';
