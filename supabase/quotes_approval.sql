alter table public.quotes
  add column if not exists sent_at timestamptz,
  add column if not exists accepted_at timestamptz,
  add column if not exists refused_at timestamptz,
  add column if not exists client_comment text;

update public.quotes
set status = 'refused'
where status = 'declined';

alter table public.quotes
  drop constraint if exists quotes_status_check;

alter table public.quotes
  add constraint quotes_status_check
  check (status in ('draft', 'sent', 'accepted', 'refused', 'expired'));

drop policy if exists "clients answer own quotes" on public.quotes;
create policy "clients answer own quotes"
on public.quotes
for update
to authenticated
using (
  status = 'sent'
  and exists (
    select 1
    from public.contact_requests
    where contact_requests.id = quotes.request_id
      and contact_requests.user_id = auth.uid()
  )
)
with check (
  status in ('accepted', 'refused')
  and exists (
    select 1
    from public.contact_requests
    where contact_requests.id = quotes.request_id
      and contact_requests.user_id = auth.uid()
  )
);
