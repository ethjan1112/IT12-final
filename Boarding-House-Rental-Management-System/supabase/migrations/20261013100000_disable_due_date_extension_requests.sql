-- Retire tenant due date extension requests without deleting existing records.
drop policy if exists extensions_read_own_or_staff on public.due_date_extension_requests;
drop policy if exists extensions_tenant_create on public.due_date_extension_requests;
drop policy if exists extensions_staff_manage on public.due_date_extension_requests;
