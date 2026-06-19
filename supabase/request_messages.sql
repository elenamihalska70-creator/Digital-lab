create table if not exists public.request_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.contact_requests(id) on delete cascade,
  sender_role text not null check (sender_role in ('admin', 'client')),
  sender_id uuid not null references auth.users(id) on delete cascade,
  message text not null check (char_length(trim(message)) > 0),
  read_by_admin boolean not null default false,
  read_by_client boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.request_messages
  add column if not exists read_by_admin boolean not null default false,
  add column if not exists read_by_client boolean not null default false;

alter table public.request_messages enable row level security;

drop policy if exists "request messages read for admin or owner" on public.request_messages;
create policy "request messages read for admin or owner"
on public.request_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
  or exists (
    select 1
    from public.contact_requests
    where contact_requests.id = request_messages.request_id
      and contact_requests.user_id = auth.uid()
  )
);

drop policy if exists "clients insert own request messages" on public.request_messages;
create policy "clients insert own request messages"
on public.request_messages
for insert
to authenticated
with check (
  sender_role = 'client'
  and sender_id = auth.uid()
  and exists (
    select 1
    from public.contact_requests
    where contact_requests.id = request_messages.request_id
      and contact_requests.user_id = auth.uid()
  )
);

drop policy if exists "admins insert request messages" on public.request_messages;
create policy "admins insert request messages"
on public.request_messages
for insert
to authenticated
with check (
  sender_role = 'admin'
  and sender_id = auth.uid()
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

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

alter publication supabase_realtime add table public.request_messages;
