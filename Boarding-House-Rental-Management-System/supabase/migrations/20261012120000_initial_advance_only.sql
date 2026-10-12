-- Remove security-deposit amounts from existing records. New room requests
-- are validated against the selected room's rent in the app service.

update public.leases
set security_deposit_amount = 0,
    security_deposit_paid = false
where security_deposit_amount <> 0 or security_deposit_paid;

update public.invoices as invoice
set total_amount = greatest(0, invoice.total_amount - invoice.security_deposit),
    security_deposit = 0,
    notes = regexp_replace(coalesce(invoice.notes, ''), '\s*\+\s*security deposit', '', 'gi'),
    status = case
      when coalesce((
        select sum(payment.amount_paid)
        from public.payments as payment
        where payment.invoice_id = invoice.id
      ), 0) >= greatest(0, invoice.total_amount - invoice.security_deposit) then 'paid'
      when coalesce((
        select sum(payment.amount_paid)
        from public.payments as payment
        where payment.invoice_id = invoice.id
      ), 0) > 0 then 'partial'
      else 'unpaid'
    end
where invoice.invoice_type = 'initial'
  and invoice.security_deposit > 0;

-- The previous room setup flow stored one advance plus one deposit (2x rent).
-- Convert existing request amounts to the advance-only amount.
update public.room_assignment_requests
set initial_payment_amount = round(initial_payment_amount / 2, 2)
where initial_payment_amount > 0;

