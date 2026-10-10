alter table public.invoices
  add column if not exists additional_charges jsonb not null default '[]'::jsonb;

-- Keep pre-existing unlabelled charges visible as an editable line item.
update public.invoices
set additional_charges = jsonb_build_array(
  jsonb_build_object('id', 'legacy-other', 'label', 'Other charges', 'amount', other_charges)
)
where other_charges > 0
  and additional_charges = '[]'::jsonb;
