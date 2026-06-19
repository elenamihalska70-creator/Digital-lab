create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.contact_requests(id) on delete cascade,
  version integer not null default 1,
  title text not null,
  description text,
  price_ht numeric not null default 0,
  vat numeric not null default 20,
  price_ttc numeric not null default 0,
  deposit_percent integer default 30,
  deposit_amount numeric not null default 0,
  remaining_amount numeric not null default 0,
  estimated_delay text,
  valid_until date,
  payment_terms text,
  status text not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'refused', 'expired')),
  sent_at timestamptz,
  accepted_at timestamptz,
  refused_at timestamptz,
  client_comment text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists quotes_request_id_version_idx
on public.quotes (request_id, version desc);

alter table public.quotes enable row level security;

drop policy if exists "quotes read for admin or request owner" on public.quotes;
create policy "quotes read for admin or request owner"
on public.quotes
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
    where contact_requests.id = quotes.request_id
      and contact_requests.user_id = auth.uid()
  )
);

drop policy if exists "admins insert quotes" on public.quotes;
create policy "admins insert quotes"
on public.quotes
for insert
to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

drop policy if exists "admins update quotes" on public.quotes;
create policy "admins update quotes"
on public.quotes
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

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
