-- Keep profile reads in the own-or-staff SELECT policy. A FOR ALL staff
-- policy also applies to SELECT and creates overlapping permissive policies.
drop policy if exists profiles_staff_manage on public.profiles;

create policy profiles_staff_insert on public.profiles
  for insert to authenticated
  with check ((select private.is_property_staff()));

create policy profiles_staff_update on public.profiles
  for update to authenticated
  using ((select private.is_property_staff()))
  with check ((select private.is_property_staff()));

create policy profiles_staff_delete on public.profiles
  for delete to authenticated
  using ((select private.is_property_staff()));
