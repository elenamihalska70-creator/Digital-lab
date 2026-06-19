alter table public.request_messages
  add column if not exists read_by_admin boolean not null default false,
  add column if not exists read_by_client boolean not null default false;

drop policy if exists "request messages mark as read for admin or owner" on public.request_messages;
create policy "request messages mark as read for admin or owner"
on public.request_messages
for update
to authenticated
using (
  (
    sender_role = 'client'
    and exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  )
  or (
    sender_role = 'admin'
    and exists (
      select 1
      from public.contact_requests
      where contact_requests.id = request_messages.request_id
        and contact_requests.user_id = auth.uid()
    )
  )
)
with check (
  (
    sender_role = 'client'
    and exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  )
  or (
    sender_role = 'admin'
    and exists (
      select 1
      from public.contact_requests
      where contact_requests.id = request_messages.request_id
        and contact_requests.user_id = auth.uid()
    )
  )
);
